# Validation Summary: Why diversify away from AWS us-east-1

## Status
validated

## Post Type
Opinion / strategy piece with technical implementation guidance (resilience & disaster-recovery guide)

## Technologies Covered
- AWS us-east-1 (N. Virginia) region
- AWS global/control-plane services: IAM, IAM Identity Center, Route 53, CloudFront (ACM certificate issuance), Lambda@Edge, AWS STS
- DynamoDB (global tables), Aurora (read replicas), Amazon S3 (cross-region replication)
- AWS CLI / SDK configuration (regional STS endpoints, regional console endpoints)
- Disaster recovery / multi-region architecture concepts (break-glass access, chaos testing, MTTE)

## Sources Consulted
- AWS regional/global service documentation — IAM, Identity Center, Route 53, CloudFront, Lambda@Edge anchoring in us-east-1 (https://docs.aws.amazon.com/)
- AWS STS regional endpoints documentation — endpoint format `sts.<region>.amazonaws.com` (https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_temp_enable-regions.html)
- AWS CloudFront / ACM requirement that CloudFront certificates be issued in us-east-1 (https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-requirements.html)
- AWS Lambda@Edge requirement to create functions in us-east-1 (https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/lambda-edge-how-it-works.html)
- DynamoDB Global Tables, Aurora read replicas, S3 Cross-Region Replication documentation (https://docs.aws.amazon.com/)
- AWS console regional sign-in URL format `https://<region>.console.aws.amazon.com`
- Public reporting on the October 20, 2025 AWS us-east-1 outage (DynamoDB DNS resolution failure and downstream impact)

## Issues Found
No technical issues found.

## Review Notes
- The October 20, 2025 outage is accurately characterized: the root trigger was a DNS resolution failure affecting DynamoDB endpoints in us-east-1, with cascading impact on dependent services and customers.
- The claims about us-east-1 being the anchor for global control planes (IAM, Identity Center, Route 53, CloudFront ACM, Lambda@Edge, billing) are correct.
- Endpoint formats given in the post are valid: regional STS (`sts.us-east-2.amazonaws.com`) and regional console (`https://us-east-2.console.aws.amazon.com`).
- Pricing claim (us-east-1 ≈ us-east-2, us-west-1 slightly higher) is consistent with AWS list pricing.
- This is primarily a strategy/opinion piece; the named vendor outages (CircleCI, Twilio, Snowflake, Ring, etc.) are presented as illustrative blast-radius examples rather than precise per-vendor postmortems, which is appropriate for the genre.
- No code blocks to execute; the technical recommendations (global tables, CRR, regional endpoints, break-glass access) are accurate and current.
