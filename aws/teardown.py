"""Destroy ajaia.pp-0.com AWS resources. Invoked 2027-11-15 05:00 UTC."""

from __future__ import annotations

import json
import os
import time

import boto3

REGION = os.environ.get("AWS_REGION", "us-east-1")
INSTANCE = os.environ.get("AJAIA_INSTANCE", "ajaia-commons")
STATIC_IP = os.environ.get("AJAIA_STATIC_IP", "ajaia-commons-ip")
ZONE_ID = os.environ.get("AJAIA_ZONE_ID", "Z00987161GLBQJF7XZJ4R")
RECORD = os.environ.get("AJAIA_RECORD", "ajaia.pp-0.com.")
RULE = os.environ.get("AJAIA_RULE", "ajaia-commons-teardown")
FUNCTION = os.environ.get("AJAIA_FUNCTION", "ajaia-commons-teardown")
ROLE = os.environ.get("AJAIA_ROLE", "ajaia-commons-teardown")


def log(msg: str) -> None:
    print(msg, flush=True)


def handler(event, context):
    lightsail = boto3.client("lightsail", region_name=REGION)
    r53 = boto3.client("route53", region_name=REGION)
    events = boto3.client("events", region_name=REGION)
    lam = boto3.client("lambda", region_name=REGION)
    iam = boto3.client("iam")

    try:
        ip = lightsail.get_static_ip(staticIpName=STATIC_IP)["staticIp"]["ipAddress"]
    except Exception as exc:
        log(f"static ip lookup: {exc}")
        ip = None

    try:
        r53.change_resource_record_sets(
            HostedZoneId=ZONE_ID,
            ChangeBatch={
                "Comment": "ajaia.pp-0.com teardown 2027-11-15",
                "Changes": [
                    {
                        "Action": "DELETE",
                        "ResourceRecordSet": {
                            "Name": RECORD,
                            "Type": "A",
                            "TTL": 300,
                            "ResourceRecords": [{"Value": ip or "0.0.0.0"}],
                        },
                    }
                ],
            },
        )
        log("deleted DNS ajaia.pp-0.com")
    except Exception as exc:
        log(f"dns delete: {exc}")
        if ip:
            try:
                sets = r53.list_resource_record_sets(HostedZoneId=ZONE_ID, StartRecordName=RECORD, MaxItems="10")
                for rr in sets.get("ResourceRecordSets", []):
                    if rr.get("Name") in (RECORD, "ajaia.pp-0.com.") and rr.get("Type") == "A":
                        r53.change_resource_record_sets(
                            HostedZoneId=ZONE_ID,
                            ChangeBatch={"Changes": [{"Action": "DELETE", "ResourceRecordSet": rr}]},
                        )
                        log("deleted DNS via listed set")
            except Exception as exc2:
                log(f"dns fallback: {exc2}")

    try:
        lightsail.detach_static_ip(staticIpName=STATIC_IP)
        log("detached static ip")
        time.sleep(2)
    except Exception as exc:
        log(f"detach ip: {exc}")

    try:
        lightsail.delete_instance(instanceName=INSTANCE)
        log("deleted lightsail instance")
    except Exception as exc:
        log(f"delete instance: {exc}")

    try:
        lightsail.release_static_ip(staticIpName=STATIC_IP)
        log("released static ip")
    except Exception as exc:
        log(f"release ip: {exc}")

    try:
        events.remove_targets(Rule=RULE, Ids=["ajaia-commons-teardown"])
        events.delete_rule(Name=RULE)
        log("deleted event rule")
    except Exception as exc:
        log(f"event rule: {exc}")

    try:
        iam.detach_role_policy(
            RoleName=ROLE,
            PolicyArn="arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
        )
    except Exception as exc:
        log(f"detach basic: {exc}")
    try:
        iam.delete_role_policy(RoleName=ROLE, PolicyName="ajaia-teardown")
    except Exception as exc:
        log(f"delete inline: {exc}")

    fn = FUNCTION
    if context is not None:
        fn = getattr(context, "function_name", FUNCTION)

    try:
        lam.delete_function(FunctionName=fn)
        log("deleted lambda")
    except Exception as exc:
        log(f"delete lambda: {exc}")

    try:
        iam.delete_role(RoleName=ROLE)
        log("deleted role")
    except Exception as exc:
        log(f"delete role: {exc}")

    return {"ok": True, "event": json.dumps(event)[:500]}
