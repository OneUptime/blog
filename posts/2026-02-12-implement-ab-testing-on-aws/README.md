# How to Implement A/B Testing on AWS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, A/B Testing, CloudFront, Lambda, Evidently

Description: Learn how to implement A/B testing on AWS using CloudWatch Evidently, Lambda@Edge, and CloudFront to run experiments and measure impact on user behavior.

---

You've got a new feature, a redesigned landing page, or a different pricing strategy. How do you know if it'll actually work? You don't guess - you test. A/B testing lets you show different versions to different users and measure which one performs better. AWS has native tools for this, and you can also build your own with Lambda@Edge and CloudFront.

Let's look at both approaches.

## Option 1: CloudWatch Evidently

AWS CloudWatch Evidently is a managed A/B testing service. It handles traffic splitting, metric collection, and statistical analysis.

### Setting Up a Feature Flag and Experiment

First, create a project and define your feature variations.

```javascript
// lambda/setup-experiment.js
const {
  EvidentlyClient,
  CreateProjectCommand,
  CreateFeatureCommand,
  CreateExperimentCommand,
  StartExperimentCommand,
} = require('@aws-sdk/client-evidently');

const client = new EvidentlyClient({});

async function setupExperiment() {
  // Step 1: Create a project
  const { project } = await client.send(new CreateProjectCommand({
    name: 'website-experiments',
    description: 'A/B tests for the marketing website',
  }));

  // Step 2: Create a feature with variations
  const { feature } = await client.send(new CreateFeatureCommand({
    project: 'website-experiments',
    name: 'checkout-flow',
    variations: [
      {
        name: 'control',
        value: { stringValue: 'original' },
      },
      {
        name: 'treatment',
        value: { stringValue: 'streamlined' },
      },
    ],
    defaultVariation: 'control',
  }));

  // Step 3: Create an experiment
  const { experiment } = await client.send(new CreateExperimentCommand({
    project: 'website-experiments',
    name: 'checkout-flow-test',
    metricGoals: [
      {
        metricDefinition: {
          name: 'conversion_rate',
          entityIdKey: 'userId',
          valueKey: 'converted',
          eventPattern: '{"eventType": "conversion"}',
        },
        desiredChange: 'INCREASE',
      },
    ],
    onlineAbConfig: {
      controlTreatmentName: 'control',
      treatmentWeights: {
        control: 50000, // 50%
        treatment: 50000, // 50%
      },
    },
    treatmentNames: ['control', 'treatment'],
  }));

  // Step 4: Start the experiment
  await client.send(new StartExperimentCommand({
    project: 'website-experiments',
    experiment: 'checkout-flow-test',
    analysisCompleteTime: new Date(Date.now() + 14 * 24 * 3600 * 1000), // 2 weeks
  }));

  return { project, feature, experiment };
}
```

### Evaluating Features in Your Application

When a user hits your application, call Evidently to determine which variation they should see.

```javascript
// lambda/evaluate-feature.js
const {
  EvidentlyClient,
  EvaluateFeatureCommand,
  PutProjectEventsCommand,
} = require('@aws-sdk/client-evidently');

const client = new EvidentlyClient({});

exports.handler = async (event) => {
  const userId = event.requestContext.authorizer?.claims?.sub || event.headers['x-user-id'];

  // Evaluate which variation this user should see
  const { variation, value } = await client.send(new EvaluateFeatureCommand({
    project: 'website-experiments',
    feature: 'checkout-flow',
    entityId: userId,
  }));

  console.log(`User ${userId} assigned to variation: ${variation}`);

  return {
    statusCode: 200,
    body: JSON.stringify({
      variation: variation,
      checkoutVersion: value.stringValue,
    }),
  };
};

// Track conversion events
async function trackConversion(userId, converted) {
  await client.send(new PutProjectEventsCommand({
    project: 'website-experiments',
    events: [{
      timestamp: new Date(),
      type: 'aws.evidently.custom',
      data: JSON.stringify({
        eventType: 'conversion',
        userId,
        converted: converted ? 1 : 0,
      }),
    }],
  }));
}
```

## Option 2: Lambda@Edge for Server-Side A/B Testing

If you want more control or don't want to use Evidently, you can implement A/B testing at the CDN level with Lambda@Edge and CloudFront.

This approach routes users to different origin paths based on a cookie, so they consistently see the same version.

```javascript
// lambda/ab-viewer-request.js
// This runs at CloudFront edge locations on every request
exports.handler = async (event) => {
  const request = event.Records[0].cf.request;
  const headers = request.headers;

  // Check for existing experiment cookie
  const cookies = headers.cookie || [];
  const cookieString = cookies.map(c => c.value).join('; ');
  const experimentMatch = cookieString.match(/experiment-group=([^;]+)/);

  let group;
  if (experimentMatch) {
    group = experimentMatch[1];
  } else {
    // Assign new users randomly (50/50 split)
    group = Math.random() < 0.5 ? 'control' : 'treatment';
  }

  // Route to different content based on group
  if (group === 'treatment') {
    // Modify the origin path to serve the treatment version
    request.uri = request.uri.replace('/checkout', '/checkout-v2');
  }

  // Pass the group as a header so the origin can use it
  request.headers['x-experiment-group'] = [{ key: 'X-Experiment-Group', value: group }];

  return request;
};
```

Set the cookie in the response so the user stays in the same group.

```javascript
// lambda/ab-viewer-response.js
// This runs on the response back to the user
exports.handler = async (event) => {
  const response = event.Records[0].cf.response;
  const request = event.Records[0].cf.request;

  const groupHeader = request.headers['x-experiment-group'];
  if (groupHeader) {
    const group = groupHeader[0].value;

    // Set cookie so user stays in the same group
    const cookieValue = `experiment-group=${group}; Path=/; Max-Age=2592000; SameSite=Lax`;

    if (!response.headers['set-cookie']) {
      response.headers['set-cookie'] = [];
    }
    response.headers['set-cookie'].push({ key: 'Set-Cookie', value: cookieValue });
  }

  return response;
};
```

## Tracking Results

Whether you use Evidently or roll your own, you need to track metrics. Send events to CloudWatch or your analytics platform.

```javascript
// lambda/track-events.js
const { CloudWatchClient, PutMetricDataCommand } = require('@aws-sdk/client-cloudwatch');

const cwClient = new CloudWatchClient({});

async function trackExperimentEvent(experimentName, group, eventType, value = 1) {
  await cwClient.send(new PutMetricDataCommand({
    Namespace: 'ABTesting',
    MetricData: [
      {
        MetricName: eventType,
        Dimensions: [
          { Name: 'Experiment', Value: experimentName },
          { Name: 'Group', Value: group },
        ],
        Value: value,
        Unit: 'Count',
        Timestamp: new Date(),
      },
    ],
  }));
}

// Usage in your application
await trackExperimentEvent('checkout-flow', 'treatment', 'page_view');
await trackExperimentEvent('checkout-flow', 'treatment', 'conversion');
await trackExperimentEvent('checkout-flow', 'treatment', 'revenue', 49.99);
```

## Statistical Significance

Don't call an experiment too early. You need enough data to be confident the difference isn't random noise. Evidently handles this automatically, but if you're doing it yourself, here's a simple significance check.

```javascript
// Simple statistical significance calculator
function calculateSignificance(controlConversions, controlTotal, treatmentConversions, treatmentTotal) {
  const controlRate = controlConversions / controlTotal;
  const treatmentRate = treatmentConversions / treatmentTotal;

  // Standard error
  const se = Math.sqrt(
    (controlRate * (1 - controlRate)) / controlTotal +
    (treatmentRate * (1 - treatmentRate)) / treatmentTotal
  );

  // Z-score
  const zScore = (treatmentRate - controlRate) / se;

  // Two-tailed p-value approximation
  const pValue = 2 * (1 - normalCDF(Math.abs(zScore)));

  return {
    controlRate: (controlRate * 100).toFixed(2) + '%',
    treatmentRate: (treatmentRate * 100).toFixed(2) + '%',
    lift: (((treatmentRate - controlRate) / controlRate) * 100).toFixed(2) + '%',
    significant: pValue < 0.05,
    pValue: pValue.toFixed(4),
  };
}

function normalCDF(x) {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp(-x * x / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
}
```

## Best Practices

A few things I've learned from running A/B tests:

- **Run tests for at least 2 weeks** to account for day-of-week effects
- **Don't peek at results early** and make decisions - this inflates your false positive rate
- **Only test one thing at a time** unless you're doing proper multivariate testing
- **Make sure your sample sizes are large enough** before drawing conclusions
- **Always have a kill switch** to stop an experiment if something goes badly wrong

For monitoring the health of your experimentation infrastructure, see our guide on [building a logging and monitoring stack on AWS](https://oneuptime.com/blog/post/build-logging-and-monitoring-stack-on-aws/view).

## Summary

A/B testing on AWS can be done with CloudWatch Evidently for a managed experience, or with Lambda@Edge and CloudFront for full control. The managed route gets you up and running faster with built-in statistical analysis. The custom route gives you more flexibility but more responsibility. Either way, make sure you're collecting clean data and letting tests run long enough to reach statistical significance.
