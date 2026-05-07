# How to Authenticate with AWS Using IAM Roles

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, IAM, Role, Authentication, Security, EC2

Description: Learn how to use AWS IAM roles to grant EC2 instances, Lambda functions, and other services secure, credential-free access to AWS resources.

---

IAM roles provide temporary credentials to AWS services, eliminating the need to store long-lived access keys on instances or in code. Services like EC2, Lambda, and ECS can receive role credentials automatically. On EC2, applications retrieve them through the instance metadata service.

---

## Create an IAM Role for EC2

```bash
# Create the trust policy

cat > trust-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Service": "ec2.amazonaws.com" },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create the role
aws iam create-role   --role-name MyEC2Role   --assume-role-policy-document file://trust-policy.json
```

---

## Attach a Permission Policy

```bash
aws iam attach-role-policy   --role-name MyEC2Role   --policy-arn arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess
```

---

## Create an Instance Profile and Attach the Role

```bash
aws iam create-instance-profile --instance-profile-name MyEC2Profile
aws iam add-role-to-instance-profile   --instance-profile-name MyEC2Profile   --role-name MyEC2Role
```

---

## Launch an EC2 Instance with the Role

```bash
# Replace with an AMI ID that exists in your AWS Region
aws ec2 run-instances   --image-id ami-0abcdef1234567890   --instance-type t3.micro   --iam-instance-profile Name=MyEC2Profile
```

---

## Using the Role in OpenTofu

```hcl
resource "aws_iam_role" "ec2_role" {
  name = "my-ec2-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_instance_profile" "ec2_profile" {
  name = "my-ec2-profile"
  role = aws_iam_role.ec2_role.name
}

resource "aws_instance" "web" {
  # Replace with an AMI ID that exists in your AWS Region
  ami                  = "ami-0abcdef1234567890"
  instance_type        = "t3.micro"
  iam_instance_profile = aws_iam_instance_profile.ec2_profile.name
}
```

---

## Verify Role is Active on the Instance

```bash
# From inside the EC2 instance
TOKEN=$(curl -X PUT "http://169.254.169.254/latest/api/token" \
  -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")
curl -H "X-aws-ec2-metadata-token: $TOKEN" \
  http://169.254.169.254/latest/meta-data/iam/security-credentials/
# Returns: MyEC2Role

aws sts get-caller-identity
```

---

## Summary

IAM roles grant AWS services temporary credentials, eliminating the need for static access keys. For EC2, applications retrieve those credentials through the instance metadata service. Create a role with a trust policy for the target service, attach permission policies, create an instance profile, and launch your EC2 instance with the profile. The AWS SDK automatically retrieves the temporary credentials, and AWS rotates them automatically.
