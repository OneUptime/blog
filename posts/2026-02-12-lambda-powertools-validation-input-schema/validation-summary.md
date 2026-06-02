# Validation Summary: How to Use Lambda Powertools Validation for Input Schema

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Lambda
- Powertools for AWS Lambda (Python)
- Python
- JSON Schema Draft 7
- API Gateway, SQS, SNS, EventBridge, Kinesis, and CloudWatch event envelopes

## Sources Consulted
- Powertools for AWS Lambda (Python) Validation documentation: https://docs.aws.amazon.com/powertools/python/3.7.0/utilities/validation/
- Powertools for AWS Lambda (Python) Validation API reference: https://docs.aws.amazon.com/powertools/python/3.12.0/api_doc/validation/
- Powertools for AWS Lambda Python upstream envelope definitions: https://github.com/aws-powertools/powertools-lambda-python/blob/develop/aws_lambda_powertools/utilities/validation/envelopes.py
- JSON Schema Draft 7 reference: https://json-schema.org/draft-07/

## Issues Found
- The install command used `pip install aws-lambda-powertools`, but the official Powertools documentation recommends installing the validation extra with `aws-lambda-powertools[validation]` so the validation dependencies are present. Updated the command to `pip install "aws-lambda-powertools[validation]"`.
- The custom format example claimed to register a custom phone format but did not add `format: "phone"` to the schema or pass a custom format map to Powertools. Updated the schema to use `format: "phone"` and the decorator to pass `inbound_formats={"phone": check_phone_number}`.
- The custom format checker raised `ValueError`; Powertools documents custom format callbacks as returning a boolean. Updated the checker to return `bool(re.match(...))`.

## Review Notes
- The built-in envelope names and JMESPath expressions in the article match the official Powertools documentation and upstream source.
- The SQS envelope example is technically correct: the validator applies the envelope before calling the handler, so the handler receives the unwrapped list of message bodies.
- All Python snippets were checked for syntax with Python 3.12. Runtime smoke testing against an installed package could not be completed locally because this environment is missing `python3.12-venv`/`ensurepip`, but the corrected APIs were verified against official documentation and upstream source.
