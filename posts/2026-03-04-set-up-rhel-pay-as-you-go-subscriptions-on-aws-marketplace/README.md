# How to Set Up RHEL Pay-As-You-Go Subscriptions on AWS Marketplace

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, AWS, Marketplace, Subscription, Cloud

Description: Learn how to launch RHEL instances on AWS using pay-as-you-go (PAYG) subscriptions from the AWS Marketplace, avoiding the need for pre-purchased Red Hat subscriptions.

---

Red Hat Enterprise Linux is available on the AWS Marketplace with a pay-as-you-go pricing model. This means you pay for RHEL usage as part of your EC2 hourly rate, with no need to bring your own subscription. This is great for short-lived workloads, testing, or teams that do not manage Red Hat subscriptions directly.

## Finding RHEL on the AWS Marketplace

You can search for RHEL AMIs directly from the AWS CLI:

```bash
# List available official RHEL PAYG AMIs in your region
aws ec2 describe-images \
  --owners 309956199498 \
  --filters "Name=name,Values=RHEL-9*" \
             "Name=architecture,Values=x86_64" \
  --query "Images[*].[ImageId,Name,CreationDate]" \
  --output table \
  --region us-east-1
```

The owner ID `309956199498` is the official Red Hat AWS account.

## Launching a PAYG RHEL Instance

Once you have an AMI ID, launch an instance as usual:

```bash
# Launch a RHEL 9 PAYG instance
aws ec2 run-instances \
  --image-id ami-0abcdef1234567890 \
  --instance-type t3.medium \
  --key-name my-key-pair \
  --security-group-ids sg-0123456789abcdef0 \
  --subnet-id subnet-0abcdef1234567890 \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=rhel-payg-test}]'
```

## Verifying the Subscription Model

After the instance is running, SSH in and confirm how the system is registered:

```bash
# Check the subscription identity
sudo subscription-manager identity

# Check the RHUI (Red Hat Update Infrastructure) repos
sudo dnf repolist
```

PAYG instances use RHUI repositories provided by AWS, not the Red Hat CDN. You will see repo names like `rhel-9-baseos-rhui-rpms` and `rhel-9-appstream-rhui-rpms`.

## Key Differences from BYOS

With PAYG, you do not need to run `subscription-manager register`. The instance is automatically configured to pull updates from AWS-hosted RHUI mirrors. If you need to switch to BYOS (Bring Your Own Subscription), you would remove the RHUI packages and register with `subscription-manager` manually.

## Cost Considerations

PAYG pricing includes both the EC2 compute cost and a Red Hat software fee. Check the AWS Marketplace listing for exact pricing per instance type. For long-running workloads, compare PAYG costs against purchasing Red Hat subscriptions and using BYOS AMIs.
