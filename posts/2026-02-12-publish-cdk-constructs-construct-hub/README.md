# How to Publish CDK Constructs to Construct Hub

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CDK, Construct Hub, Open Source

Description: Step-by-step guide to publishing your AWS CDK constructs to Construct Hub for community sharing, including jsii setup, documentation, and multi-language support.

---

If you've built a CDK construct that solves a real problem, why not share it with the community? AWS Construct Hub is the central registry for CDK constructs, and publishing there makes your construct discoverable to thousands of CDK developers. The best part is that your TypeScript construct automatically becomes available in Python, Java, C#, and Go - thanks to jsii.

The process involves a few steps: setting up jsii for cross-language compilation, structuring your project correctly, writing good documentation, and publishing to npm (which Construct Hub indexes automatically).

## Setting Up the Project with jsii

jsii (JavaScript Interoperability Interface) is what makes your TypeScript constructs work in other languages. You'll need to configure your project to use jsii instead of plain TypeScript:

```bash
# Initialize a new jsii project
mkdir cdk-aurora-monitoring && cd cdk-aurora-monitoring
npx projen new awscdk-construct
```

Using Projen is the recommended way, but you can also set it up manually. Here's what your `package.json` needs:

```json
{
  "name": "cdk-aurora-monitoring",
  "version": "0.1.0",
  "description": "CDK construct for comprehensive Aurora monitoring and alerting",
  "main": "lib/index.js",
  "types": "lib/index.d.ts",
  "license": "Apache-2.0",
  "author": {
    "name": "Your Name",
    "email": "you@example.com"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/your-org/cdk-aurora-monitoring.git"
  },
  "keywords": [
    "aws",
    "cdk",
    "aurora",
    "monitoring",
    "cloudwatch"
  ],
  "jsii": {
    "outdir": "dist",
    "targets": {
      "python": {
        "distName": "cdk-aurora-monitoring",
        "module": "cdk_aurora_monitoring"
      },
      "java": {
        "package": "com.example.cdk.aurora.monitoring",
        "maven": {
          "groupId": "com.example",
          "artifactId": "cdk-aurora-monitoring"
        }
      },
      "dotnet": {
        "namespace": "Example.Cdk.AuroraMonitoring",
        "packageId": "Example.Cdk.AuroraMonitoring"
      }
    },
    "tsc": {
      "outDir": "lib",
      "rootDir": "src"
    }
  },
  "peerDependencies": {
    "aws-cdk-lib": "^2.100.0",
    "constructs": "^10.0.0"
  },
  "devDependencies": {
    "aws-cdk-lib": "^2.100.0",
    "constructs": "^10.0.0",
    "jsii": "^5.3.0",
    "jsii-pacmak": "^1.93.0",
    "jsii-rosetta": "^5.3.0"
  },
  "scripts": {
    "build": "jsii",
    "watch": "jsii -w",
    "test": "jest",
    "package": "jsii-pacmak",
    "compat": "jsii-diff"
  },
  "stability": "experimental"
}
```

## Building the Construct

Write your construct in the `src` directory. Here's an example Aurora monitoring construct:

```typescript
// src/aurora-monitoring.ts - The construct to publish
import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as rds from 'aws-cdk-lib/aws-rds';
import { Construct } from 'constructs';

/**
 * Configuration for Aurora monitoring thresholds.
 */
export interface AuroraMonitoringThresholds {
  /**
   * CPU utilization alarm threshold as a percentage.
   * @default 80
   */
  readonly cpuThreshold?: number;

  /**
   * Database connection count alarm threshold.
   * @default 100
   */
  readonly connectionThreshold?: number;

  /**
   * Freeable memory alarm threshold in bytes.
   * @default 256000000 (256 MB)
   */
  readonly freeableMemoryThreshold?: number;

  /**
   * Read latency alarm threshold in seconds.
   * @default 0.02 (20ms)
   */
  readonly readLatencyThreshold?: number;
}

/**
 * Properties for AuroraMonitoring construct.
 */
export interface AuroraMonitoringProps {
  /**
   * The Aurora database cluster to monitor.
   */
  readonly cluster: rds.IDatabaseCluster;

  /**
   * SNS topic for alarm notifications.
   */
  readonly alarmTopic: sns.ITopic;

  /**
   * Custom alarm thresholds. Uses sensible defaults if not specified.
   * @default - uses default thresholds
   */
  readonly thresholds?: AuroraMonitoringThresholds;

  /**
   * Prefix for alarm names.
   * @default - cluster identifier
   */
  readonly alarmNamePrefix?: string;
}

/**
 * Creates comprehensive CloudWatch alarms for an Aurora database cluster.
 *
 * @example
 *
 * new AuroraMonitoring(this, 'Monitoring', {
 *   cluster: myAuroraCluster,
 *   alarmTopic: alertsTopic,
 * });
 */
export class AuroraMonitoring extends Construct {
  /** The CPU utilization alarm */
  public readonly cpuAlarm: cloudwatch.Alarm;
  /** The database connections alarm */
  public readonly connectionAlarm: cloudwatch.Alarm;
  /** The CloudWatch dashboard */
  public readonly dashboard: cloudwatch.Dashboard;

  constructor(scope: Construct, id: string, props: AuroraMonitoringProps) {
    super(scope, id);

    const prefix = props.alarmNamePrefix ?? 'Aurora';
    const thresholds = props.thresholds ?? {};

    // CPU alarm
    this.cpuAlarm = new cloudwatch.Alarm(this, 'CpuAlarm', {
      alarmName: `${prefix}-HighCPU`,
      metric: props.cluster.metricCPUUtilization({
        period: cdk.Duration.minutes(5),
      }),
      threshold: thresholds.cpuThreshold ?? 80,
      evaluationPeriods: 3,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
    });
    this.cpuAlarm.addAlarmAction(new actions.SnsAction(props.alarmTopic));

    // Connection alarm
    this.connectionAlarm = new cloudwatch.Alarm(this, 'ConnectionAlarm', {
      alarmName: `${prefix}-HighConnections`,
      metric: props.cluster.metricDatabaseConnections({
        period: cdk.Duration.minutes(5),
      }),
      threshold: thresholds.connectionThreshold ?? 100,
      evaluationPeriods: 3,
    });
    this.connectionAlarm.addAlarmAction(new actions.SnsAction(props.alarmTopic));

    // Dashboard
    this.dashboard = new cloudwatch.Dashboard(this, 'Dashboard', {
      dashboardName: `${prefix}-Monitoring`,
    });

    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'CPU Utilization',
        left: [props.cluster.metricCPUUtilization()],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'Database Connections',
        left: [props.cluster.metricDatabaseConnections()],
        width: 12,
      }),
    );
  }
}
```

Notice the JSDoc comments. They're not just for documentation - jsii uses them to generate documentation for other languages. Every public property and method should be documented.

## The Index File

Export everything from a single entry point:

```typescript
// src/index.ts - Public API surface
export {
  AuroraMonitoring,
  AuroraMonitoringProps,
  AuroraMonitoringThresholds,
} from './aurora-monitoring';
```

## Writing Documentation

Construct Hub renders your README as the main documentation page. Write a good one:

```markdown
# cdk-aurora-monitoring

Comprehensive CloudWatch monitoring for Amazon Aurora clusters.

## Installation

TypeScript/JavaScript:
npm install cdk-aurora-monitoring

Python:
pip install cdk-aurora-monitoring

## Usage

const monitoring = new AuroraMonitoring(this, 'Monitoring', {
  cluster: myAuroraCluster,
  alarmTopic: alertsTopic,
  thresholds: {
    cpuThreshold: 90,
    connectionThreshold: 200,
  },
});
```

## jsii Compatibility Rules

jsii has restrictions that regular TypeScript doesn't. Your code must follow these rules:

```typescript
// DO: Use interfaces for props (not type aliases)
export interface MyProps {
  readonly name: string;
}

// DON'T: Use type aliases
// export type MyProps = { name: string }  // Won't work with jsii

// DO: Use readonly properties in interfaces
export interface Config {
  readonly value: string;
}

// DON'T: Use Record, Pick, Omit, or other utility types
// export interface Config extends Pick<Other, 'field'> {}  // Won't work

// DO: Export classes and interfaces explicitly
export class MyConstruct extends Construct {}

// DON'T: Use default exports
// export default class MyConstruct {}  // Won't work with jsii
```

## Building and Packaging

Build the construct for all target languages:

```bash
# Build the TypeScript
npx jsii

# Generate packages for all languages
npx jsii-pacmak

# Check for breaking API changes
npx jsii-diff npm:cdk-aurora-monitoring
```

The `jsii-pacmak` command generates packages in the `dist` directory for each configured target language.

## Publishing

Publishing to npm makes your construct automatically appear on Construct Hub within a few hours:

```bash
# Build everything first
npx jsii && npx jsii-pacmak

# Publish to npm
npm publish

# Publish Python package to PyPI
twine upload dist/python/*.tar.gz

# Publish Java package to Maven Central
# (requires additional Maven configuration)
```

## Automated Publishing with GitHub Actions

Set up CI/CD to automatically publish new versions:

```yaml
# .github/workflows/release.yml
name: Release
on:
  push:
    branches: [main]

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npx jsii
      - run: npm test
      - run: npx jsii-pacmak
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## API Stability

Mark your construct's stability level in `package.json`:

- `experimental` - API may change without notice
- `stable` - follows semantic versioning strictly
- `deprecated` - being phased out

Construct Hub displays this prominently, so users know what to expect.

For project management tooling that helps with construct libraries, see [CDK with Projen](https://oneuptime.com/blog/post/2026-02-12-cdk-projen-project-management/view). For patterns on sharing constructs privately within your org, check out [sharing CDK constructs across projects](https://oneuptime.com/blog/post/2026-02-12-share-cdk-constructs-across-projects/view).

## Wrapping Up

Publishing to Construct Hub extends your construct's reach to the entire CDK community across all supported languages. The key ingredients are jsii for cross-language support, solid documentation, good tests, and automated publishing. Start with an experimental stability level, gather feedback, and promote to stable once the API settles. Your construct could save thousands of developers the same effort you put into building it.
