# Validation Summary: How to Deploy a Flask App to AWS

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- AWS Elastic Beanstalk
- AWS CLI and Elastic Beanstalk CLI
- Amazon ECS on AWS Fargate
- Amazon ECR
- AWS Lambda and Serverless Framework
- Flask
- Gunicorn
- AWS Systems Manager Parameter Store
- CloudWatch Logs
- Flask-SQLAlchemy and SQLAlchemy

## Sources Consulted
- AWS Elastic Beanstalk Python platform documentation: https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/create-deploy-python-container.html
- AWS Elastic Beanstalk EB CLI `eb init` documentation: https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/eb3-init.html
- AWS Elastic Beanstalk EB CLI `eb create` documentation: https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/eb3-create.html
- Amazon ECR getting started with Docker and AWS CLI: https://docs.aws.amazon.com/AmazonECR/latest/userguide/getting-started-cli.html
- Amazon ECS Fargate task definition documentation: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/fargate-tasks-services.html
- Amazon ECS task definition parameters: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html
- Amazon ECS task execution IAM role documentation: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_execution_IAM_role.html
- Serverless Framework `serverless-wsgi` plugin documentation: https://www.serverless.com/plugins/serverless-wsgi
- Serverless Framework Python packaging documentation: https://www.serverless.com/framework/docs/providers/aws/guide/python
- Serverless Framework HTTP API events documentation: https://www.serverless.com/framework/docs/providers/aws/events/http-api
- Flask quickstart documentation: https://flask.palletsprojects.com/en/stable/quickstart/
- Flask-SQLAlchemy configuration documentation: https://flask-sqlalchemy.palletsprojects.com/en/stable/config/
- SQLAlchemy connection pooling documentation: https://docs.sqlalchemy.org/en/21/core/pooling.html

## Issues Found
- The ECS Fargate task definition omitted `executionRoleArn`. Because the example pulls from a private ECR repository and uses the `awslogs` log driver, the ECS task execution role is required. Added an `ecsTaskExecutionRole` ARN placeholder.
- The Serverless install command used `pip install serverless-wsgi`, which is for direct Python handler usage, not installing the Serverless Framework plugin used by the shown `serverless.yml`. Replaced it with a local npm development dependency install for the `serverless-wsgi` plugin.
- The Serverless configuration listed `serverless-python-requirements`, which is now deprecated as a standalone plugin in favor of Serverless Framework built-in Python requirements support. Removed it from the plugin list while keeping the `custom.pythonRequirements` block.
- The Flask-SQLAlchemy example used removed configuration keys `SQLALCHEMY_POOL_SIZE` and `SQLALCHEMY_POOL_RECYCLE`. Replaced them with `SQLALCHEMY_ENGINE_OPTIONS` using `pool_size` and `pool_recycle`.

## Review Notes
The Elastic Beanstalk `WSGIPath`, static files namespace, EB CLI command shape, ECR Docker authentication flow, Fargate CPU and memory values, `awsvpc` network mode, Flask app syntax, Gunicorn command, SSM `get_parameter(..., WithDecryption=True)`, and Serverless HTTP API catch-all event were checked and are technically plausible for the versions discussed. The ECS section remains a task-definition-only example; a complete ECS deployment would also need a cluster, service or run-task command, networking configuration, security groups, and a CloudWatch log group or permission to create one.
