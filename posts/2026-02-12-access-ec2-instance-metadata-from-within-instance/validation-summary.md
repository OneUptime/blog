# Validation Summary: How to Access EC2 Instance Metadata from Within the Instance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS EC2 Instance Metadata Service (IMDS)
- IMDSv1 and IMDSv2
- AWS CLI
- IAM role credentials for EC2
- EC2 user data, dynamic data, instance identity documents, network interface metadata, and instance tags
- Bash, curl, Python requests, and Flask

## Sources Consulted
- AWS EC2 User Guide: Use the Instance Metadata Service to access instance metadata: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-service.html
- AWS EC2 User Guide: Use instance metadata to manage your EC2 instance: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-metadata.html
- AWS EC2 User Guide: Access instance metadata for an EC2 instance: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instancedata-data-retrieval.html
- AWS EC2 User Guide: Instance identity documents for Amazon EC2 instances: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instance-identity-documents.html
- AWS CLI Command Reference: modify-instance-metadata-options: https://awscli.amazonaws.com/v2/documentation/api/latest/reference/ec2/modify-instance-metadata-options.html
- Requests documentation: API reference for Response.raise_for_status: https://requests.readthedocs.io/en/latest/api/
- Flask documentation: Quickstart routing patterns: https://flask.palletsprojects.com/en/stable/quickstart/

## Issues Found
- The opening description said IMDS does not require authentication, which was misleading for instances configured to require IMDSv2. Updated it to explain that IMDSv1 uses simple GET requests while IMDSv2 requires a session token.
- The initial curl section presented IMDSv1-style requests as universal. Added a caveat that those requests work only when IMDSv1 is allowed, and that IMDSv2-required instances need the token pattern shown later.
- The Python metadata helper returned response bodies even for HTTP errors such as 401 or 404. Added `response.raise_for_status()` so failures are handled by the existing exception path.
- The Flask health check example referenced `get_metadata()` without defining it in the snippet. Added the helper function so the example is syntactically and functionally complete.

## Review Notes
The remaining IMDSv1-style curl examples are technically valid for instances where IMDSv1 is optional or enabled, and the post now makes that scope explicit. For production examples, a future improvement would be to consistently use IMDSv2 token retrieval throughout all shell and Python snippets.
