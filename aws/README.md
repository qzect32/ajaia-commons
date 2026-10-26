# AWS host for ajaia.pp-0.com

Personal account only (`AWS_PROFILE=personal`, 371338439034).

- Lightsail instance `ajaia-commons` (small_3_0, us-east-1a)
- Static IP `ajaia-commons-ip`
- Route53 A record `ajaia.pp-0.com` on zone `Z00987161GLBQJF7XZJ4R`
- 15 GB loop volume mounted at `/data`
- EventBridge rule `ajaia-commons-teardown` cron `0 5 15 11 ? 2027` (midnight ET 2027-11-15)
- Lambda `ajaia-commons-teardown` deletes instance, IP, DNS, rule, function, role

Do not touch apex `pp-0.com` or `portfolio.pp-0.com`.
