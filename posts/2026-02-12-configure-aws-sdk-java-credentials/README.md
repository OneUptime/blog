# How to Configure AWS SDK for Java with Credentials

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Java, SDK, Security

Description: Learn how to configure credentials for the AWS SDK for Java v2, including default provider chain, profiles, environment variables, role assumption, and secure practices.

---

Credential configuration is the first thing you need to get right with the AWS SDK for Java. Get it wrong, and nothing works. Get it partially wrong, and things work in dev but break in production. The v2 SDK has a sophisticated credential resolution chain that handles most scenarios automatically, but understanding how it works - and how to override it - is essential.

## The Default Credential Provider Chain

When you create a client without specifying credentials, the SDK searches through a chain of providers in this order:

1. Java system properties (`aws.accessKeyId`, `aws.secretAccessKey`)
2. Environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)
3. Web identity token (for EKS)
4. Shared credentials file (`~/.aws/credentials`)
5. AWS config file (`~/.aws/config`)
6. ECS container credentials
7. EC2 instance profile credentials

For most applications, you don't need to configure anything explicitly.

```java
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.regions.Region;

// The SDK automatically resolves credentials from the chain
S3Client s3 = S3Client.builder()
    .region(Region.US_EAST_1)
    .build();

// This works if any credential source in the chain is configured
s3.listBuckets().buckets().forEach(b ->
    System.out.println(b.name())
);
```

## Environment Variables

The most common approach for containers and CI/CD.

```bash
# Set these in your environment
export AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
export AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
export AWS_SESSION_TOKEN=FwoGZXIvYXdzEBY...  # optional, for temp credentials
export AWS_REGION=us-east-1
```

```java
import software.amazon.awssdk.auth.credentials.EnvironmentVariableCredentialsProvider;
import software.amazon.awssdk.services.s3.S3Client;

// Explicitly use environment variables (usually not needed since it's in the chain)
S3Client s3 = S3Client.builder()
    .region(Region.US_EAST_1)
    .credentialsProvider(EnvironmentVariableCredentialsProvider.create())
    .build();
```

## Shared Credentials File

For local development, credentials from `~/.aws/credentials` are the standard approach.

```ini
# ~/.aws/credentials
[default]
aws_access_key_id = AKIAIOSFODNN7EXAMPLE
aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

[staging]
aws_access_key_id = AKIAI44QH8DHBEXAMPLE
aws_secret_access_key = je7MtGbClwBF/2Zp9Utk/h3yCo8nvbEXAMPLEKEY
```

Using a specific profile from the credentials file.

```java
import software.amazon.awssdk.auth.credentials.ProfileCredentialsProvider;
import software.amazon.awssdk.services.s3.S3Client;

// Use the default profile
S3Client s3Default = S3Client.builder()
    .region(Region.US_EAST_1)
    .credentialsProvider(ProfileCredentialsProvider.create())
    .build();

// Use a named profile
S3Client s3Staging = S3Client.builder()
    .region(Region.US_EAST_1)
    .credentialsProvider(ProfileCredentialsProvider.create("staging"))
    .build();
```

## Static Credentials (For Testing Only)

You can provide credentials directly. This should only be used in tests, never in production code.

```java
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.AwsSessionCredentials;
import software.amazon.awssdk.services.s3.S3Client;

// Basic credentials (long-term - NOT recommended for production)
S3Client s3 = S3Client.builder()
    .region(Region.US_EAST_1)
    .credentialsProvider(StaticCredentialsProvider.create(
        AwsBasicCredentials.create(
            "AKIAIOSFODNN7EXAMPLE",
            "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
        )
    ))
    .build();

// Session credentials (temporary - from STS)
S3Client s3Temp = S3Client.builder()
    .region(Region.US_EAST_1)
    .credentialsProvider(StaticCredentialsProvider.create(
        AwsSessionCredentials.create(
            "AKIAIOSFODNN7EXAMPLE",
            "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
            "session-token-here"
        )
    ))
    .build();
```

## Assuming IAM Roles

Role assumption is the recommended pattern for cross-account access and production deployments.

```java
import software.amazon.awssdk.services.sts.StsClient;
import software.amazon.awssdk.services.sts.auth.StsAssumeRoleCredentialsProvider;
import software.amazon.awssdk.services.sts.model.AssumeRoleRequest;

// Assume a role using StsAssumeRoleCredentialsProvider
// This automatically refreshes credentials before they expire
StsClient stsClient = StsClient.builder()
    .region(Region.US_EAST_1)
    .build();

StsAssumeRoleCredentialsProvider roleCredentials =
    StsAssumeRoleCredentialsProvider.builder()
        .stsClient(stsClient)
        .refreshRequest(AssumeRoleRequest.builder()
            .roleArn("arn:aws:iam::123456789012:role/CrossAccountRole")
            .roleSessionName("my-app-session")
            .durationSeconds(3600)
            .build())
        .build();

S3Client s3CrossAccount = S3Client.builder()
    .region(Region.US_EAST_1)
    .credentialsProvider(roleCredentials)
    .build();
```

## Role Chaining

Sometimes you need to assume one role and then assume another from there.

```java
import software.amazon.awssdk.services.sts.StsClient;
import software.amazon.awssdk.services.sts.auth.StsAssumeRoleCredentialsProvider;
import software.amazon.awssdk.services.sts.model.AssumeRoleRequest;

// First role assumption
StsAssumeRoleCredentialsProvider firstRole =
    StsAssumeRoleCredentialsProvider.builder()
        .stsClient(StsClient.builder().region(Region.US_EAST_1).build())
        .refreshRequest(AssumeRoleRequest.builder()
            .roleArn("arn:aws:iam::111111111111:role/IntermediateRole")
            .roleSessionName("intermediate")
            .build())
        .build();

// Second role assumption using the first role's credentials
StsClient stsWithFirstRole = StsClient.builder()
    .region(Region.US_EAST_1)
    .credentialsProvider(firstRole)
    .build();

StsAssumeRoleCredentialsProvider secondRole =
    StsAssumeRoleCredentialsProvider.builder()
        .stsClient(stsWithFirstRole)
        .refreshRequest(AssumeRoleRequest.builder()
            .roleArn("arn:aws:iam::222222222222:role/TargetRole")
            .roleSessionName("target")
            .build())
        .build();

// Use the chained role credentials
S3Client s3 = S3Client.builder()
    .region(Region.US_EAST_1)
    .credentialsProvider(secondRole)
    .build();
```

## EC2 Instance Profile Credentials

When running on EC2, the SDK automatically picks up the instance's IAM role. No configuration needed.

```java
import software.amazon.awssdk.auth.credentials.InstanceProfileCredentialsProvider;

// Explicitly use instance profile credentials (usually auto-detected)
S3Client s3 = S3Client.builder()
    .region(Region.US_EAST_1)
    .credentialsProvider(InstanceProfileCredentialsProvider.create())
    .build();
```

## ECS Container Credentials

Similarly, ECS tasks get credentials from their task role automatically.

```java
import software.amazon.awssdk.auth.credentials.ContainerCredentialsProvider;

S3Client s3 = S3Client.builder()
    .region(Region.US_EAST_1)
    .credentialsProvider(ContainerCredentialsProvider.builder().build())
    .build();
```

## Verifying Credentials

Test your credential configuration by calling STS GetCallerIdentity.

```java
import software.amazon.awssdk.services.sts.StsClient;
import software.amazon.awssdk.services.sts.model.GetCallerIdentityResponse;

StsClient sts = StsClient.builder().region(Region.US_EAST_1).build();

try {
    GetCallerIdentityResponse identity = sts.getCallerIdentity();
    System.out.println("Account: " + identity.account());
    System.out.println("ARN: " + identity.arn());
    System.out.println("User ID: " + identity.userId());
} catch (Exception e) {
    System.err.println("Credentials invalid: " + e.getMessage());
}
```

## Spring Boot Integration

If you're using Spring Boot, the AWS SDK integrates cleanly with dependency injection.

```java
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;

@Configuration
public class AwsConfig {

    @Bean
    public S3Client s3Client() {
        return S3Client.builder()
            .region(Region.US_EAST_1)
            .build();  // uses default credential chain
    }

    @Bean
    public DynamoDbClient dynamoDbClient() {
        return DynamoDbClient.builder()
            .region(Region.US_EAST_1)
            .build();
    }
}
```

## Best Practices

- **Never hardcode credentials.** Use the credential provider chain or environment variables.
- **Use IAM roles in production.** Instance profiles and task roles are the most secure option.
- **Use the default provider chain.** It works in development (profile) and production (role) without code changes.
- **Rotate access keys regularly** if you must use long-term credentials.
- **Use StsAssumeRoleCredentialsProvider** for cross-account access. It handles credential refresh automatically.
- **Test credentials early.** Call `getCallerIdentity()` at startup to fail fast if credentials are misconfigured.

For more on using these configured clients with the Java SDK, see the [AWS SDK for Java v2 guide](https://oneuptime.com/blog/post/aws-sdk-java-v2/view). And for local testing without real credentials, [LocalStack](https://oneuptime.com/blog/post/localstack-test-aws-services-locally/view) lets you test AWS operations with dummy credentials.
