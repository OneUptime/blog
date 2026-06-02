# Validation Summary: How to Set Up a Python REST API on AWS with Flask and Lambda

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- Flask
- AWS Lambda
- Amazon API Gateway HTTP API
- Mangum
- asgiref WsgiToAsgi
- Amazon DynamoDB
- Boto3
- Marshmallow
- Serverless Framework
- serverless-python-requirements
- Amazon CloudWatch

## Sources Consulted
- Flask ASGI deployment documentation: https://flask.palletsprojects.com/en/stable/deploying/asgi/
- Mangum GitHub README: https://github.com/Kludex/mangum
- AWS Lambda Python runtime documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-python.html
- Serverless Framework HTTP API event documentation: https://www.serverless.com/framework/docs/providers/aws/events/http-api
- Boto3 DynamoDB guide: https://boto3.amazonaws.com/v1/documentation/api/latest/guide/dynamodb.html
- Boto3 DynamoDB scan API reference: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/dynamodb/client/scan.html
- Marshmallow fields documentation: https://marshmallow.readthedocs.io/en/stable/marshmallow.fields.html
- OneUptime AWS monitoring post link: https://oneuptime.com/blog/post/2026-02-13-aws-monitoring-tools-comparison/view
- OneUptime Flask deployment post link: https://oneuptime.com/blog/post/2026-02-12-deploy-flask-app-to-aws/view

## Issues Found
- Mangum was described as an ASGI/WSGI adapter and the handler passed the Flask WSGI app directly to `Mangum`. Mangum supports ASGI applications, while Flask is WSGI, so the post now installs `asgiref`, wraps the Flask app with `WsgiToAsgi`, and passes the ASGI wrapper to Mangum.
- The setup commands installed Python packages but did not create the `requirements.txt` used by `serverless-python-requirements`, and did not install the Serverless Framework plugin declared in `serverless.yml`. The setup now freezes Python dependencies and installs `serverless` plus `serverless-python-requirements` as development dependencies.
- The Flask route was defined at `/api/users/`, but the local POST test used `/api/users` without the trailing slash. The curl example now targets `/api/users/`.
- The route examples used `request.json`, which can raise framework-level JSON/content-type errors before Marshmallow validation. The POST and PUT examples now use `request.get_json(silent=True) or {}` so validation errors are returned consistently as the route intends.
- The Serverless HTTP API function timeout was set to 30 seconds. Serverless Framework documentation notes that API Gateway HTTP API uses a 30-second maximum and recommends keeping the Lambda timeout below 29 seconds, so the example now uses 28 seconds.

## Review Notes
The remaining examples are technically valid for a small tutorial API. In a production version, the DynamoDB list endpoint should document scan pagination with `LastEvaluatedKey`, and update operations could use DynamoDB `UpdateItem` or conditional writes to reduce overwrite race risks.
