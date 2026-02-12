# How to Use CloudFormation Helper Scripts (cfn-init, cfn-signal)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CloudFormation, EC2, DevOps

Description: A practical guide to using CloudFormation helper scripts like cfn-init and cfn-signal to configure EC2 instances during stack creation and signal completion status.

---

CloudFormation can create an EC2 instance for you, but creating the instance is only half the battle. You also need to install packages, write configuration files, start services, and confirm everything's working. That's where CloudFormation helper scripts come in.

These scripts - cfn-init, cfn-signal, cfn-get-metadata, and cfn-hup - are pre-installed on Amazon Linux AMIs and can be installed on other distributions. They bridge the gap between "instance exists" and "instance is configured and ready to serve traffic."

## The Helper Scripts Overview

There are four helper scripts, each with a specific job.

**cfn-init** reads metadata from the CloudFormation template and uses it to configure the instance - installing packages, creating files, running commands, and managing services.

**cfn-signal** sends a signal back to CloudFormation to indicate whether the instance configuration succeeded or failed.

**cfn-get-metadata** retrieves metadata from the stack, useful for debugging.

**cfn-hup** is a daemon that watches for metadata changes and re-runs cfn-init when the template is updated.

## Using cfn-init

The real power of cfn-init is in the AWS::CloudFormation::Init metadata block. Instead of stuffing everything into UserData bash scripts, you declare what you want, and cfn-init handles the details.

Here's a template that sets up a web server using cfn-init.

```yaml
# Template that uses cfn-init to configure an Apache web server
AWSTemplateFormatVersion: "2010-09-09"
Description: EC2 instance configured with cfn-init

Parameters:
  LatestAmiId:
    Type: AWS::SSM::Parameter::Value<AWS::EC2::Image::Id>
    Default: /aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64

Resources:
  WebServerInstance:
    Type: AWS::EC2::Instance
    Metadata:
      AWS::CloudFormation::Init:
        # configSets let you control the order of execution
        configSets:
          default:
            - install
            - configure
            - start_services

        install:
          packages:
            yum:
              httpd: []
              php: []
              mysql: []

        configure:
          files:
            # Create the main web page
            /var/www/html/index.html:
              content: |
                <html>
                  <body>
                    <h1>Hello from CloudFormation!</h1>
                    <p>This server was configured by cfn-init.</p>
                  </body>
                </html>
              mode: "000644"
              owner: apache
              group: apache

            # Create a custom Apache config
            /etc/httpd/conf.d/custom.conf:
              content: |
                ServerTokens Prod
                ServerSignature Off
                TraceEnable Off
              mode: "000644"
              owner: root
              group: root

            # Create the cfn-hup config for future updates
            /etc/cfn/cfn-hup.conf:
              content: !Sub |
                [main]
                stack=${AWS::StackId}
                region=${AWS::Region}
                interval=5
              mode: "000400"
              owner: root
              group: root

            /etc/cfn/hooks.d/cfn-auto-reloader.conf:
              content: !Sub |
                [cfn-auto-reloader-hook]
                triggers=post.update
                path=Resources.WebServerInstance.Metadata.AWS::CloudFormation::Init
                action=/opt/aws/bin/cfn-init -v --stack ${AWS::StackName} --resource WebServerInstance --region ${AWS::Region}
                runas=root
              mode: "000400"
              owner: root
              group: root

        start_services:
          services:
            sysvinit:
              httpd:
                enabled: true
                ensureRunning: true
                files:
                  - /etc/httpd/conf.d/custom.conf
              cfn-hup:
                enabled: true
                ensureRunning: true
                files:
                  - /etc/cfn/cfn-hup.conf
                  - /etc/cfn/hooks.d/cfn-auto-reloader.conf

    Properties:
      ImageId: !Ref LatestAmiId
      InstanceType: t3.micro
      UserData:
        Fn::Base64: !Sub |
          #!/bin/bash -xe
          # Run cfn-init to process the metadata
          /opt/aws/bin/cfn-init -v \
            --stack ${AWS::StackName} \
            --resource WebServerInstance \
            --configsets default \
            --region ${AWS::Region}

          # Signal whether cfn-init succeeded or failed
          /opt/aws/bin/cfn-signal -e $? \
            --stack ${AWS::StackName} \
            --resource WebServerInstance \
            --region ${AWS::Region}

    # Wait for the signal before marking the resource as complete
    CreationPolicy:
      ResourceSignal:
        Timeout: PT10M
```

Let's break down what's happening. The Metadata block declares the desired state - packages to install, files to create, and services to run. The UserData script calls cfn-init, which reads this metadata and does the work. Then cfn-signal reports back whether everything succeeded.

## Config Sets

Config sets give you control over the order of operations. By default, cfn-init processes sections in this order: packages, groups, users, sources, files, commands, services. But configSets let you define custom groupings.

```yaml
# Using configSets to control execution order
Metadata:
  AWS::CloudFormation::Init:
    configSets:
      # You can reference individual configs or other configSets
      full_install:
        - base
        - app
        - monitoring
      base_only:
        - base

    base:
      packages:
        yum:
          jq: []
          wget: []
      commands:
        01_update_system:
          command: yum update -y

    app:
      sources:
        # Download and extract an application archive
        /opt/myapp: https://my-bucket.s3.amazonaws.com/myapp-v1.2.tar.gz
      commands:
        01_setup_app:
          command: /opt/myapp/setup.sh
          cwd: /opt/myapp

    monitoring:
      commands:
        01_install_agent:
          command: |
            wget https://example.com/monitoring-agent.sh
            bash monitoring-agent.sh
          cwd: /tmp
```

## Using cfn-signal

cfn-signal is what makes CloudFormation aware of your instance's configuration status. Without it, CloudFormation considers the instance ready as soon as it's running - not when your application is actually configured.

There are two ways to use cfn-signal. The simpler approach uses the exit code from cfn-init.

```bash
# Signal based on cfn-init's exit status
# $? captures the exit code of the previous command
/opt/aws/bin/cfn-signal -e $? \
  --stack my-stack-name \
  --resource WebServerInstance \
  --region us-east-1
```

For more complex scenarios, you might want to run additional health checks before signaling.

```bash
#!/bin/bash -xe
# Run cfn-init first
/opt/aws/bin/cfn-init -v \
  --stack ${AWS::StackName} \
  --resource WebServerInstance \
  --region ${AWS::Region}

# Run a health check before signaling success
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/)
  if [ "$HTTP_STATUS" == "200" ]; then
    echo "Health check passed!"
    /opt/aws/bin/cfn-signal -e 0 \
      --stack ${AWS::StackName} \
      --resource WebServerInstance \
      --region ${AWS::Region}
    exit 0
  fi
  RETRY_COUNT=$((RETRY_COUNT + 1))
  sleep 10
done

# Health check failed after all retries
echo "Health check failed!"
/opt/aws/bin/cfn-signal -e 1 \
  --stack ${AWS::StackName} \
  --resource WebServerInstance \
  --region ${AWS::Region}
```

## Using cfn-hup for Updates

cfn-hup is a daemon that detects changes to your stack's metadata and re-runs cfn-init. This means you can update your instance configuration by updating the CloudFormation stack - no need to replace the instance.

The configuration requires two files. We already saw them in the cfn-init example above, but here's a closer look.

```ini
# /etc/cfn/cfn-hup.conf - Main configuration
[main]
stack=arn:aws:cloudformation:us-east-1:123456789:stack/my-stack/guid
region=us-east-1
# Check for changes every 5 minutes
interval=5
```

```ini
# /etc/cfn/hooks.d/cfn-auto-reloader.conf - Hook configuration
[cfn-auto-reloader-hook]
triggers=post.update
path=Resources.WebServerInstance.Metadata.AWS::CloudFormation::Init
action=/opt/aws/bin/cfn-init -v --stack my-stack --resource WebServerInstance --region us-east-1
runas=root
```

## Debugging cfn-init Failures

When cfn-init fails, the logs are your best friend. Check these locations.

```bash
# cfn-init log - shows what cfn-init tried to do
cat /var/log/cfn-init.log

# cfn-init command output log
cat /var/log/cfn-init-cmd.log

# Cloud-init log - shows UserData execution
cat /var/log/cloud-init-output.log
```

A common debugging technique is to set the CreationPolicy timeout high enough that you can SSH into the instance and inspect the logs before CloudFormation gives up.

## Installing Helper Scripts on Non-Amazon Linux

If you're using Ubuntu or another distribution, you'll need to install the helper scripts manually.

```bash
# Install helper scripts on Ubuntu/Debian
apt-get update -y
apt-get install -y python3-pip
pip3 install https://s3.amazonaws.com/cloudformation-examples/aws-cfn-bootstrap-py3-latest.tar.gz
```

The helper scripts bridge an important gap in CloudFormation's capabilities. They let you treat instance configuration as code right inside your templates, and they give CloudFormation visibility into whether that configuration succeeded. For more about organizing the templates that use these scripts, check out the post on [organizing large CloudFormation projects](https://oneuptime.com/blog/post/organize-large-cloudformation-projects/view).

Once your instances are configured and running, don't forget to set up proper monitoring. Knowing that your cfn-init succeeded during deployment is great, but you also need to know when things go sideways in production.
