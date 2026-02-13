# How to Set Up AWS CodeCommit Repositories

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CodeCommit, Git, DevOps

Description: A complete guide to setting up AWS CodeCommit Git repositories, configuring authentication methods, managing access with IAM policies, and establishing repository best practices.

---

AWS CodeCommit is a fully managed Git repository service. If your team is already deep in the AWS ecosystem, CodeCommit keeps your source code within your AWS boundary - same account, same IAM policies, same encryption. There's no need to manage a Git server, worry about scaling, or deal with storage limits.

That said, CodeCommit is deliberately simple. It's a Git hosting service, not a full development platform like GitHub or GitLab. There are no built-in CI/CD runners, no issue tracker, and no pull request reviews in the way GitHub does them. What it does offer is tight IAM integration, encryption at rest, and a reliable Git remote that lives in your AWS account.

## Step 1: Create a Repository

Creating a repo is straightforward.

```bash
# Create a new repository
aws codecommit create-repository \
  --repository-name my-application \
  --repository-description "Main application repository" \
  --tags Team=Backend,Environment=Production

# Create additional repositories for your microservices
aws codecommit create-repository \
  --repository-name auth-service \
  --repository-description "Authentication microservice"

aws codecommit create-repository \
  --repository-name api-gateway \
  --repository-description "API Gateway configuration and Lambda authorizers"
```

Verify the repository was created and get the clone URLs.

```bash
# Get repository details including clone URLs
aws codecommit get-repository \
  --repository-name my-application \
  --query 'repositoryMetadata.{Name:repositoryName,CloneUrlHttp:cloneUrlHttp,CloneUrlSsh:cloneUrlSsh,Arn:Arn}'
```

## Step 2: Configure Authentication

CodeCommit supports three authentication methods: HTTPS with Git credentials, SSH keys, and the credential helper. Each has its place.

### Option A: HTTPS Git Credentials

This is the simplest approach. Generate Git credentials for your IAM user.

```bash
# Generate HTTPS Git credentials
aws iam create-service-specific-credential \
  --user-name your-iam-username \
  --service-name codecommit.amazonaws.com
```

Save the username and password from the output. Then configure Git to use them.

```bash
# Clone using the generated credentials
git clone https://git-codecommit.us-east-1.amazonaws.com/v1/repos/my-application

# Git will prompt for the username and password from the credentials above
# To avoid repeated prompts, cache the credentials
git config --global credential.helper store
```

### Option B: SSH Keys

If you prefer SSH, upload your public key to IAM.

```bash
# Upload your SSH public key
aws iam upload-ssh-public-key \
  --user-name your-iam-username \
  --ssh-public-key-body file://~/.ssh/id_rsa.pub
```

Note the SSH key ID from the output. Configure your SSH config file.

```bash
# Add to ~/.ssh/config
cat >> ~/.ssh/config << 'EOF'
Host git-codecommit.*.amazonaws.com
  User YOUR_SSH_KEY_ID
  IdentityFile ~/.ssh/id_rsa
EOF

# Test the connection
ssh git-codecommit.us-east-1.amazonaws.com

# Clone via SSH
git clone ssh://git-codecommit.us-east-1.amazonaws.com/v1/repos/my-application
```

### Option C: AWS CLI Credential Helper

This uses your AWS CLI credentials directly, so there are no separate Git credentials to manage. It's the best option for automated tools and CI/CD pipelines.

```bash
# Configure the credential helper globally
git config --global credential.helper '!aws codecommit credential-helper $@'
git config --global credential.UseHttpPath true

# Now clone - it will use your AWS credentials automatically
git clone https://git-codecommit.us-east-1.amazonaws.com/v1/repos/my-application
```

## Step 3: Configure IAM Policies for Access Control

Control who can do what with IAM policies.

```bash
# Policy for developers: full access to specific repos
cat > dev-codecommit-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "codecommit:GitPull",
        "codecommit:GitPush",
        "codecommit:CreateBranch",
        "codecommit:DeleteBranch",
        "codecommit:GetBranch",
        "codecommit:ListBranches",
        "codecommit:CreatePullRequest",
        "codecommit:GetPullRequest",
        "codecommit:ListPullRequests",
        "codecommit:MergePullRequestByFastForward",
        "codecommit:MergePullRequestBySquash",
        "codecommit:UpdatePullRequestDescription",
        "codecommit:UpdatePullRequestTitle",
        "codecommit:GetRepository",
        "codecommit:ListRepositories"
      ],
      "Resource": [
        "arn:aws:codecommit:us-east-1:123456789012:my-application",
        "arn:aws:codecommit:us-east-1:123456789012:auth-service"
      ]
    }
  ]
}
EOF

aws iam put-user-policy \
  --user-name developer-alice \
  --policy-name CodeCommitDeveloper \
  --policy-document file://dev-codecommit-policy.json
```

For read-only access (useful for auditors or external contractors):

```bash
# Read-only policy
cat > readonly-codecommit-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "codecommit:GitPull",
        "codecommit:GetBranch",
        "codecommit:GetCommit",
        "codecommit:GetRepository",
        "codecommit:ListBranches",
        "codecommit:ListRepositories",
        "codecommit:BatchGetRepositories"
      ],
      "Resource": "*"
    }
  ]
}
EOF
```

## Step 4: Protect Important Branches

Prevent direct pushes to main/production branches using a conditional IAM policy.

```bash
# Deny direct pushes to main branch
cat > branch-protection.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Deny",
      "Action": [
        "codecommit:GitPush",
        "codecommit:DeleteBranch",
        "codecommit:PutFile",
        "codecommit:MergeBranchesByFastForward",
        "codecommit:MergeBranchesBySquash",
        "codecommit:MergeBranchesByThreeWay"
      ],
      "Resource": "arn:aws:codecommit:us-east-1:123456789012:my-application",
      "Condition": {
        "StringEqualsIfExists": {
          "codecommit:References": [
            "refs/heads/main",
            "refs/heads/production"
          ]
        },
        "Null": {
          "codecommit:References": "false"
        }
      }
    }
  ]
}
EOF

aws iam put-group-policy \
  --group-name developers \
  --policy-name ProtectMainBranch \
  --policy-document file://branch-protection.json
```

This forces developers to use pull requests for changes to main.

## Step 5: Set Up Repository Defaults

Configure default branch and repository metadata.

```bash
# Set the default branch
aws codecommit update-default-branch \
  --repository-name my-application \
  --default-branch-name main

# Add a README and initial commit
cd /tmp
git clone https://git-codecommit.us-east-1.amazonaws.com/v1/repos/my-application
cd my-application

git checkout -b main

echo "# My Application" > README.md
echo "Main application repository" >> README.md
git add README.md
git commit -m "Initial commit"
git push origin main
```

## Step 6: Enable Repository Encryption

CodeCommit encrypts repositories at rest by default using AWS-managed keys. If you need customer-managed keys for compliance:

```bash
# Create a KMS key for CodeCommit
aws kms create-key \
  --description "KMS key for CodeCommit repository encryption" \
  --key-usage ENCRYPT_DECRYPT

# Associate the key with a repository
aws codecommit associate-approval-rule-template-with-repository \
  --repository-name my-application \
  --approval-rule-template-name require-approvals
```

## Step 7: Create Approval Rule Templates

For repositories that need code review before merging, create approval rules.

```bash
# Create an approval rule template
aws codecommit create-approval-rule-template \
  --approval-rule-template-name require-two-approvals \
  --approval-rule-template-content '{
    "Version": "2018-11-08",
    "DestinationReferences": ["refs/heads/main"],
    "Statements": [{
      "Type": "Approvers",
      "NumberOfApprovalsNeeded": 2,
      "ApprovalPoolMembers": ["arn:aws:iam::123456789012:root"]
    }]
  }'

# Associate the template with a repository
aws codecommit associate-approval-rule-template-with-repository \
  --approval-rule-template-name require-two-approvals \
  --repository-name my-application
```

## Listing and Managing Repositories

Useful commands for day-to-day repository management.

```bash
# List all repositories
aws codecommit list-repositories --sort-by lastModifiedDate --order descending

# Get repository info
aws codecommit get-repository --repository-name my-application

# List branches
aws codecommit list-branches --repository-name my-application

# Delete a repository (careful!)
aws codecommit delete-repository --repository-name old-unused-repo
```

CodeCommit is a solid choice when you want simple, secure Git hosting that plays nicely with the rest of your AWS infrastructure. It's not trying to compete with GitHub on features - it's focused on being a reliable, private Git remote with IAM-based access control. For setting up CI/CD triggers from your CodeCommit repos, check out our guide on [CodeCommit triggers and notifications](https://oneuptime.com/blog/post/2026-02-12-set-up-codecommit-triggers-and-notifications/view).
