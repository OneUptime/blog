# How to Set Up AWS Mainframe Modernization

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Mainframe Modernization, COBOL, Migration, Replatform, Refactor

Description: Learn how to set up AWS Mainframe Modernization to migrate and modernize mainframe workloads using automated refactoring or replatforming approaches.

---

Mainframes are not going away anytime soon, but maintaining them is getting harder and more expensive. The hardware is aging, the workforce that understands COBOL and JCL is shrinking, and licensing costs keep climbing. AWS Mainframe Modernization helps organizations migrate mainframe workloads to AWS using two distinct approaches: replatforming (running existing mainframe code on AWS) and automated refactoring (converting mainframe code to modern languages). The AWS Mainframe Modernization managed runtime environment is no longer open to new customers, but existing customers can continue to use it; new projects should evaluate the self-managed experience or AWS Transform for mainframe.

This guide covers how to set up both approaches and choose the right one for your situation.

## Two Paths to Modernization

```mermaid
graph TD
    A[Mainframe Workload] --> B{Which approach?}
    B --> C[Replatform with Rocket Software]
    B --> D[Refactor with AWS Transform for mainframe]
    C --> E[COBOL/PL/I runs on AWS]
    C --> F[Minimal code changes]
    C --> G[Faster migration]
    D --> H[Code converted to Java]
    D --> I[Significant code transformation]
    D --> J[Cloud-native result]
```

**Replatforming (Rocket Software, formerly Micro Focus)**: Your COBOL, PL/I, and JCL code runs on AWS using the Rocket Software runtime environment. The code stays largely the same, but runs on modern infrastructure. This is faster and lower risk.

**Automated Refactoring (AWS Transform for mainframe, formerly AWS Blu Age)**: Your mainframe code is automatically converted to modern Java code. The result is a cloud-native application, but the transformation process is more complex.

## Choosing Your Approach

| Factor | Replatform (Rocket Software) | Refactor (AWS Transform for mainframe) |
|---|---|---|
| Speed | Weeks to months | Months to years |
| Risk | Lower | Higher |
| Code changes | Minimal | Automated conversion |
| Long-term maintenance | Still COBOL | Modern language |
| Developer availability | Shrinking COBOL pool | Broad Java pool |
| Cloud-native features | Limited | Full |
| Cost to migrate | Lower | Higher |
| Cost to operate | Medium | Lower long-term |

For most organizations, the practical approach is to replatform first to get off the mainframe quickly, then selectively refactor the most critical applications over time.

## Setting Up Replatforming with Rocket Software

### Step 1: Create a Managed Runtime Environment

```python
# Create a Rocket Software managed runtime environment

import boto3

m2 = boto3.client('m2')

response = m2.create_environment(
    name='mainframe-replatform',
    engineType='microfocus',
    instanceType='M2.m5.large',
    # Choose a supported version returned by list_engine_versions.
    engineVersion='8.0.11',
    subnetIds=['subnet-private-1', 'subnet-private-2'],
    securityGroupIds=['sg-mainframe-runtime'],
    storageConfigurations=[
        {
            'efs': {
                'fileSystemId': 'fs-abc123',
                'mountPoint': '/m2/data'
            }
        }
    ],
    highAvailabilityConfig={
        'desiredCapacity': 2
    },
    tags={
        'Project': 'MainframeModernization',
        'Environment': 'Production'
    }
)

environment_id = response['environmentId']
print(f"Environment creating: {environment_id}")
```

### Step 2: Prepare Your Application

Before deploying to the managed environment, you need to:

1. **Export source code** from the mainframe (COBOL, PL/I, JCL, copybooks)
2. **Export data** (VSAM files, DB2 databases, IMS databases)
3. **Compile the code** for the Rocket Software runtime

Create an application definition:

```json
{
  "definition": {
    "s3Location": "s3://mainframe-migration/app-definition.json"
  },
  "name": "core-banking-app",
  "description": "Core banking batch and CICS transactions",
  "engineType": "microfocus",
  "tags": {
    "BusinessUnit": "Banking",
    "Criticality": "High"
  }
}
```

The application definition file describes your application components:

```json
{
  "template-version": "2.0",
  "source-locations": [
    {
      "source-id": "s3-source",
      "source-type": "s3",
      "properties": {
        "s3-bucket": "mainframe-migration",
        "s3-key-prefix": "source-code/"
      }
    }
  ],
  "definition": {
    "listeners": [
      {
        "port": 5101,
        "type": "tn3270"
      }
    ],
    "dataset-location": {
      "db-locations": [
        {
          "name": "Database",
          "secret-manager-arn": "arn:aws:secretsmanager:us-east-1:123456789012:secret:m2-datasets-AbCdEf"
        }
      ]
    },
    "batch-settings": {
      "initiators": [
        {
          "classes": ["A", "B"],
          "description": "Batch job initiators"
        }
      ],
      "jcl-file-location": "${s3-source}/batch/jcl",
      "program-path": "/m2/mount/libs/loadlib"
    },
    "cics-settings": {
      "binary-file-location": "${s3-source}/cics/binaries",
      "csd-file-location": "${s3-source}/cics/def",
      "system-initialization-table": "BNKCICV"
    }
  }
}
```

### Step 3: Deploy the Application

```python
# Create and deploy the application
import boto3

m2 = boto3.client('m2')

# Create the application
app_response = m2.create_application(
    name='core-banking-app',
    description='Core banking COBOL application',
    engineType='microfocus',
    definition={
        'content': '{"template-version": "2.0", ...}'  # Your definition JSON
    }
)

app_id = app_response['applicationId']
app_version = app_response['applicationVersion']

# Update the application definition to create a new application version
version_response = m2.update_application(
    applicationId=app_id,
    currentApplicationVersion=app_version,
    definition={
        's3Location': 's3://mainframe-migration/app-definition-v2.json'
    }
)

new_app_version = version_response['applicationVersion']

# Deploy to the runtime environment
m2.create_deployment(
    applicationId=app_id,
    applicationVersion=new_app_version,
    environmentId=environment_id
)
```

### Step 4: Migrate Data

Mainframe data lives in various formats: VSAM, sequential files, DB2, and IMS. Each requires a different approach.

**VSAM and Sequential Files**: Convert to relational tables or S3 objects.

```python
# Use the File Transfer utility to convert VSAM to relational format
# The Rocket Software runtime includes data migration utilities

# For DB2 databases, use DMS
dms = boto3.client('dms')

dms.create_endpoint(
    EndpointIdentifier='source-mainframe-db2',
    EndpointType='source',
    EngineName='db2-zos',
    ServerName='mainframe-host',
    Port=446,
    DatabaseName='BANKDB',
    Username='dms_user',
    Password='password'
)

dms.create_endpoint(
    EndpointIdentifier='target-rds-postgres',
    EndpointType='target',
    EngineName='postgres',
    ServerName='mainframe-db.abc123.us-east-1.rds.amazonaws.com',
    Port=5432,
    DatabaseName='banking',
    Username='admin',
    Password='password'
)
```

## Setting Up Automated Refactoring with AWS Transform for mainframe

### Step 1: Analyze Your Code

Before refactoring, AWS Transform for mainframe analyzes your mainframe code to understand complexity and identify potential issues:

```python
# Start code analysis
m2 = boto3.client('m2')

# Upload source code to S3
# s3://mainframe-migration/source-code/
# - COBOL programs
# - Copybooks
# - JCL procedures
# - BMS maps (screen definitions)

# Create the transformation project and run analysis in AWS Transform for mainframe
```

The analysis produces a report covering:
- Lines of code by language
- Complexity metrics per program
- Data flow analysis
- Screen/UI inventory
- Dead code identification
- Dependency graph

### Step 2: Configure the Refactoring Project

Create an AWS Transform for mainframe refactoring project. Existing AWS Mainframe Modernization managed runtime customers can use a managed runtime environment for AWS Transform for mainframe applications:

```python
# Create an AWS Transform for mainframe managed runtime environment
response = m2.create_environment(
    name='mainframe-refactor',
    engineType='bluage',
    instanceType='M2.m5.xlarge',
    # Choose a supported version returned by list_engine_versions.
    engineVersion='3.7.0',
    subnetIds=['subnet-private-1', 'subnet-private-2'],
    securityGroupIds=['sg-bluage-runtime']
)
```

### Step 3: Execute the Refactoring

AWS Transform for mainframe converts your COBOL/PL/I code to Java:

```text
COBOL Source                    -->  Java Output
IDENTIFICATION DIVISION.             @Service
PROGRAM-ID. CALC-INTEREST.           public class CalcInterest {
WORKING-STORAGE SECTION.
01 WS-PRINCIPAL   PIC 9(9)V99.       private BigDecimal principal;
01 WS-RATE        PIC 9(3)V99.       private BigDecimal rate;
01 WS-INTEREST    PIC 9(9)V99.       private BigDecimal interest;

PROCEDURE DIVISION.                   public void execute() {
    COMPUTE WS-INTEREST =                interest = principal
        WS-PRINCIPAL *                       .multiply(rate)
        WS-RATE / 100.                       .divide(BigDecimal.valueOf(100));
    DISPLAY WS-INTEREST.                 log.info("Interest: {}", interest);
    STOP RUN.                          }
                                     }
```

The automated conversion handles:
- COBOL/PL/I to Java class conversion
- CICS transaction to REST API mapping
- BMS screen to web UI conversion
- JCL to Spring Batch job conversion
- VSAM file access to database access
- DB2 SQL to standard SQL

### Step 4: Review and Test the Generated Code

The generated code needs review and testing:

```bash
# Build the generated Java project
cd /generated/core-banking-java
mvn clean package

# Run unit tests (generated from mainframe test cases)
mvn test

# Run integration tests
mvn verify -Pintegration-tests
```

Key things to validate:
- Business logic produces the same results as the mainframe
- Data calculations match (especially decimal precision)
- Transaction boundaries are preserved
- Error handling works correctly
- Performance meets requirements

## Monitoring the Modernized Application

```python
# Set up CloudWatch monitoring for the managed environment
import boto3

cloudwatch = boto3.client('cloudwatch')

# Monitor the M2 environment
cloudwatch.put_metric_alarm(
    AlarmName='M2-Environment-CPU',
    Namespace='AWS/M2',
    MetricName='CPUUtilization',
    Dimensions=[
        {'Name': 'environmentId', 'Value': environment_id}
    ],
    Statistic='Average',
    Period=300,
    EvaluationPeriods=3,
    Threshold=80,
    ComparisonOperator='GreaterThanThreshold',
    AlarmActions=['arn:aws:sns:us-east-1:123456789:ops-alerts']
)
```

For comprehensive monitoring of your modernized mainframe workloads, [OneUptime](https://oneuptime.com/blog/post/2026-02-12-migrate-from-on-premises-to-aws-step-by-step/view) provides application monitoring that covers both the runtime environment and the business transactions that depend on it.

## Testing Strategies

Mainframe modernization requires rigorous testing:

1. **Unit testing**: Compare output of individual programs/functions
2. **Integration testing**: End-to-end transaction testing
3. **Regression testing**: Run production workloads in parallel
4. **Performance testing**: Ensure batch jobs complete within windows
5. **Data validation**: Compare database states after parallel runs

```python
# Parallel run comparison
def compare_outputs(mainframe_output, aws_output):
    differences = []

    for key in mainframe_output:
        if key not in aws_output:
            differences.append(f"Missing in AWS: {key}")
        elif mainframe_output[key] != aws_output[key]:
            differences.append(
                f"Mismatch for {key}: mainframe={mainframe_output[key]}, aws={aws_output[key]}"
            )

    return differences
```

## Planning the Cutover

Mainframe cutovers typically happen over a weekend:

```mermaid
gantt
    title Mainframe Cutover Plan
    dateFormat HH:mm
    section Friday Night
    Stop batch jobs         :f1, 22:00, 1h
    Final data sync         :f2, after f1, 2h
    section Saturday
    Data validation         :s1, 01:00, 3h
    Application testing     :s2, after s1, 4h
    Performance testing     :s3, after s2, 4h
    section Sunday
    Go/No-Go decision      :u1, 08:00, 1h
    DNS/routing switch      :u2, after u1, 1h
    Monitor                 :u3, after u2, 8h
    section Monday
    Full production         :m1, 06:00, 12h
```

Always keep the mainframe available for rollback during the stabilization period.

## Wrapping Up

AWS Mainframe Modernization provides two clear paths off the mainframe: replatforming to get off quickly with minimal risk, and automated refactoring for a cloud-native end state. Most organizations benefit from starting with replatforming to reduce mainframe costs immediately, then selectively refactoring the most valuable applications. The key to success is thorough testing, especially parallel running of production workloads to validate that the modernized system produces identical results to the mainframe. Take it application by application, validate rigorously, and maintain a rollback path until you are confident in the new platform.
