# How to Set Up Alerting for BullMQ Queues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BullMQ, Node.js, Redis, Alerting, Monitoring, PagerDuty, Slack, Webhooks, Observability

Description: A comprehensive guide to setting up alerting for BullMQ queues, including threshold-based alerts, anomaly detection, integration with PagerDuty, Slack, and other notification systems, and building robust alerting pipelines.

---

Effective alerting is critical for maintaining healthy BullMQ queues. Without proper alerts, queue backlogs, job failures, and worker issues can go unnoticed until they impact users. This guide covers comprehensive alerting strategies for BullMQ queues.

## Alert Categories

Before implementing alerts, understand the key categories:

```typescript
interface AlertConfig {
  name: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  condition: (metrics: QueueMetrics) => boolean;
  cooldownMinutes: number;
}

interface QueueMetrics {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
  processingRate: number; // jobs per minute
  failureRate: number; // percentage
  avgProcessingTime: number; // milliseconds
  oldestJobAge: number; // milliseconds
}

const alertConfigs: AlertConfig[] = [
  {
    name: 'high_queue_depth',
    description: 'Queue has too many waiting jobs',
    severity: 'warning',
    condition: (m) => m.waiting > 1000,
    cooldownMinutes: 15,
  },
  {
    name: 'critical_queue_depth',
    description: 'Queue depth critically high',
    severity: 'critical',
    condition: (m) => m.waiting > 5000,
    cooldownMinutes: 5,
  },
  {
    name: 'high_failure_rate',
    description: 'Job failure rate exceeds threshold',
    severity: 'warning',
    condition: (m) => m.failureRate > 5,
    cooldownMinutes: 10,
  },
  {
    name: 'critical_failure_rate',
    description: 'Critical job failure rate',
    severity: 'critical',
    condition: (m) => m.failureRate > 20,
    cooldownMinutes: 5,
  },
  {
    name: 'no_processing',
    description: 'No jobs being processed despite queue depth',
    severity: 'critical',
    condition: (m) => m.waiting > 0 && m.active === 0 && !m.paused,
    cooldownMinutes: 5,
  },
  {
    name: 'slow_processing',
    description: 'Jobs taking too long to process',
    severity: 'warning',
    condition: (m) => m.avgProcessingTime > 60000,
    cooldownMinutes: 15,
  },
  {
    name: 'stale_jobs',
    description: 'Jobs waiting too long in queue',
    severity: 'warning',
    condition: (m) => m.oldestJobAge > 3600000, // 1 hour
    cooldownMinutes: 30,
  },
];
```

## Alert Manager Implementation

Create a robust alert manager:

```typescript
import { Queue, QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';
import { EventEmitter } from 'events';

interface Alert {
  id: string;
  queue: string;
  name: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  metrics: QueueMetrics;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
}

interface NotificationChannel {
  name: string;
  send(alert: Alert): Promise<void>;
}

class AlertManager extends EventEmitter {
  private queues: Map<string, Queue> = new Map();
  private alerts: Map<string, Alert> = new Map();
  private alertCooldowns: Map<string, number> = new Map();
  private channels: NotificationChannel[] = [];
  private checkInterval: NodeJS.Timeout | null = null;
  private metricsHistory: Map<string, QueueMetrics[]> = new Map();

  constructor(
    private connection: Redis,
    private configs: AlertConfig[] = alertConfigs
  ) {
    super();
  }

  addQueue(name: string): void {
    const queue = new Queue(name, { connection: this.connection });
    this.queues.set(name, queue);
    this.metricsHistory.set(name, []);
  }

  addChannel(channel: NotificationChannel): void {
    this.channels.push(channel);
  }

  start(intervalMs: number = 30000): void {
    this.checkInterval = setInterval(() => this.checkAllQueues(), intervalMs);
    this.checkAllQueues(); // Initial check
  }

  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  private async checkAllQueues(): Promise<void> {
    for (const [name, queue] of this.queues) {
      try {
        const metrics = await this.collectMetrics(name, queue);
        this.updateMetricsHistory(name, metrics);
        await this.evaluateAlerts(name, metrics);
      } catch (error) {
        console.error(`Error checking queue ${name}:`, error);
      }
    }
  }

  private async collectMetrics(name: string, queue: Queue): Promise<QueueMetrics> {
    const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
      queue.isPaused(),
    ]);

    // Calculate rates from history
    const history = this.metricsHistory.get(name) || [];
    const previousMetrics = history[history.length - 1];

    let processingRate = 0;
    let failureRate = 0;

    if (previousMetrics) {
      const completedDiff = completed - previousMetrics.completed;
      const failedDiff = failed - previousMetrics.failed;
      const totalProcessed = completedDiff + failedDiff;

      processingRate = completedDiff * 2; // Per minute (assuming 30s interval)
      failureRate = totalProcessed > 0 ? (failedDiff / totalProcessed) * 100 : 0;
    }

    // Get oldest waiting job age
    const waitingJobs = await queue.getWaiting(0, 0);
    const oldestJobAge = waitingJobs.length > 0
      ? Date.now() - waitingJobs[0].timestamp
      : 0;

    // Calculate average processing time from recent completed jobs
    const recentCompleted = await queue.getCompleted(0, 99);
    const processingTimes = recentCompleted
      .filter((job) => job.processedOn && job.finishedOn)
      .map((job) => job.finishedOn! - job.processedOn!);

    const avgProcessingTime = processingTimes.length > 0
      ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length
      : 0;

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      paused,
      processingRate,
      failureRate,
      avgProcessingTime,
      oldestJobAge,
    };
  }

  private updateMetricsHistory(name: string, metrics: QueueMetrics): void {
    const history = this.metricsHistory.get(name) || [];
    history.push(metrics);

    // Keep last 100 data points
    if (history.length > 100) {
      history.shift();
    }

    this.metricsHistory.set(name, history);
  }

  private async evaluateAlerts(name: string, metrics: QueueMetrics): Promise<void> {
    for (const config of this.configs) {
      const alertKey = `${name}:${config.name}`;
      const existingAlert = this.alerts.get(alertKey);
      const isInCooldown = this.isInCooldown(alertKey, config.cooldownMinutes);

      if (config.condition(metrics)) {
        // Alert condition is true
        if (!existingAlert && !isInCooldown) {
          await this.fireAlert(name, config, metrics);
        }
      } else {
        // Alert condition is false - resolve if exists
        if (existingAlert && !existingAlert.resolved) {
          await this.resolveAlert(alertKey);
        }
      }
    }
  }

  private isInCooldown(alertKey: string, cooldownMinutes: number): boolean {
    const lastFired = this.alertCooldowns.get(alertKey);
    if (!lastFired) return false;
    return Date.now() - lastFired < cooldownMinutes * 60 * 1000;
  }

  private async fireAlert(
    queueName: string,
    config: AlertConfig,
    metrics: QueueMetrics
  ): Promise<void> {
    const alertKey = `${queueName}:${config.name}`;
    const alert: Alert = {
      id: `${alertKey}:${Date.now()}`,
      queue: queueName,
      name: config.name,
      description: config.description,
      severity: config.severity,
      metrics,
      timestamp: new Date(),
      resolved: false,
    };

    this.alerts.set(alertKey, alert);
    this.alertCooldowns.set(alertKey, Date.now());
    this.emit('alert', alert);

    // Send to all channels
    await Promise.all(
      this.channels.map((channel) =>
        channel.send(alert).catch((err) =>
          console.error(`Failed to send alert via ${channel.name}:`, err)
        )
      )
    );
  }

  private async resolveAlert(alertKey: string): Promise<void> {
    const alert = this.alerts.get(alertKey);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      this.emit('resolved', alert);

      // Notify resolution
      await Promise.all(
        this.channels.map((channel) =>
          channel.send({ ...alert, description: `RESOLVED: ${alert.description}` }).catch((err) =>
            console.error(`Failed to send resolution via ${channel.name}:`, err)
          )
        )
      );
    }
  }

  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter((a) => !a.resolved);
  }

  getAlertHistory(): Alert[] {
    return Array.from(this.alerts.values());
  }
}
```

## Slack Integration

Send alerts to Slack:

```typescript
import fetch from 'node-fetch';

class SlackChannel implements NotificationChannel {
  name = 'slack';

  constructor(private webhookUrl: string, private channel?: string) {}

  async send(alert: Alert): Promise<void> {
    const color = this.getColor(alert.severity);
    const emoji = alert.resolved ? ':white_check_mark:' : this.getEmoji(alert.severity);

    const payload = {
      channel: this.channel,
      attachments: [
        {
          color,
          blocks: [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: `${emoji} BullMQ Alert: ${alert.name}`,
              },
            },
            {
              type: 'section',
              fields: [
                {
                  type: 'mrkdwn',
                  text: `*Queue:*\n${alert.queue}`,
                },
                {
                  type: 'mrkdwn',
                  text: `*Severity:*\n${alert.severity.toUpperCase()}`,
                },
                {
                  type: 'mrkdwn',
                  text: `*Status:*\n${alert.resolved ? 'Resolved' : 'Active'}`,
                },
                {
                  type: 'mrkdwn',
                  text: `*Time:*\n${alert.timestamp.toISOString()}`,
                },
              ],
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Description:*\n${alert.description}`,
              },
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Metrics:*\n\`\`\`${JSON.stringify(alert.metrics, null, 2)}\`\`\``,
              },
            },
          ],
        },
      ],
    };

    await fetch(this.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  private getColor(severity: string): string {
    switch (severity) {
      case 'critical':
        return '#dc3545';
      case 'warning':
        return '#ffc107';
      default:
        return '#17a2b8';
    }
  }

  private getEmoji(severity: string): string {
    switch (severity) {
      case 'critical':
        return ':rotating_light:';
      case 'warning':
        return ':warning:';
      default:
        return ':information_source:';
    }
  }
}
```

## PagerDuty Integration

Send critical alerts to PagerDuty:

```typescript
import fetch from 'node-fetch';

class PagerDutyChannel implements NotificationChannel {
  name = 'pagerduty';

  constructor(
    private routingKey: string,
    private minSeverity: 'info' | 'warning' | 'critical' = 'critical'
  ) {}

  async send(alert: Alert): Promise<void> {
    // Only send alerts meeting minimum severity
    if (!this.shouldSend(alert.severity)) {
      return;
    }

    const payload = {
      routing_key: this.routingKey,
      event_action: alert.resolved ? 'resolve' : 'trigger',
      dedup_key: `${alert.queue}:${alert.name}`,
      payload: {
        summary: `[${alert.severity.toUpperCase()}] BullMQ: ${alert.description} (${alert.queue})`,
        source: 'bullmq-alerting',
        severity: this.mapSeverity(alert.severity),
        timestamp: alert.timestamp.toISOString(),
        custom_details: {
          queue: alert.queue,
          alert_name: alert.name,
          metrics: alert.metrics,
        },
      },
    };

    const response = await fetch('https://events.pagerduty.com/v2/enqueue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`PagerDuty API error: ${response.statusText}`);
    }
  }

  private shouldSend(severity: string): boolean {
    const severityLevels = { info: 0, warning: 1, critical: 2 };
    return severityLevels[severity as keyof typeof severityLevels] >=
      severityLevels[this.minSeverity];
  }

  private mapSeverity(severity: string): string {
    switch (severity) {
      case 'critical':
        return 'critical';
      case 'warning':
        return 'warning';
      default:
        return 'info';
    }
  }
}
```

## Email Notifications

Send email alerts:

```typescript
import nodemailer from 'nodemailer';

class EmailChannel implements NotificationChannel {
  name = 'email';
  private transporter: nodemailer.Transporter;

  constructor(
    private smtpConfig: nodemailer.TransportOptions,
    private recipients: string[],
    private fromAddress: string
  ) {
    this.transporter = nodemailer.createTransport(smtpConfig);
  }

  async send(alert: Alert): Promise<void> {
    const subject = `[${alert.severity.toUpperCase()}] BullMQ Alert: ${alert.name} - ${alert.queue}`;

    const html = `
      <h2>BullMQ Queue Alert</h2>
      <table style="border-collapse: collapse; width: 100%;">
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Queue</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${alert.queue}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Alert</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${alert.name}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Severity</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${alert.severity}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Status</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${alert.resolved ? 'Resolved' : 'Active'}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Time</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${alert.timestamp.toISOString()}</td>
        </tr>
      </table>
      <h3>Description</h3>
      <p>${alert.description}</p>
      <h3>Current Metrics</h3>
      <pre style="background: #f4f4f4; padding: 10px;">${JSON.stringify(alert.metrics, null, 2)}</pre>
    `;

    await this.transporter.sendMail({
      from: this.fromAddress,
      to: this.recipients.join(', '),
      subject,
      html,
    });
  }
}
```

## Webhook Integration

Send alerts to any webhook:

```typescript
import fetch from 'node-fetch';

class WebhookChannel implements NotificationChannel {
  name = 'webhook';

  constructor(
    private url: string,
    private headers: Record<string, string> = {},
    private transform?: (alert: Alert) => any
  ) {}

  async send(alert: Alert): Promise<void> {
    const payload = this.transform ? this.transform(alert) : this.defaultPayload(alert);

    const response = await fetch(this.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.headers,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Webhook error: ${response.statusText}`);
    }
  }

  private defaultPayload(alert: Alert): any {
    return {
      event: alert.resolved ? 'alert.resolved' : 'alert.fired',
      alert: {
        id: alert.id,
        queue: alert.queue,
        name: alert.name,
        severity: alert.severity,
        description: alert.description,
        timestamp: alert.timestamp.toISOString(),
        resolved: alert.resolved,
        resolvedAt: alert.resolvedAt?.toISOString(),
      },
      metrics: alert.metrics,
    };
  }
}
```

## Anomaly Detection

Detect anomalies in queue behavior:

```typescript
class AnomalyDetector {
  private baselineMetrics: Map<string, number[]> = new Map();
  private windowSize = 100;

  updateBaseline(metricName: string, value: number): void {
    const values = this.baselineMetrics.get(metricName) || [];
    values.push(value);

    if (values.length > this.windowSize) {
      values.shift();
    }

    this.baselineMetrics.set(metricName, values);
  }

  isAnomaly(metricName: string, currentValue: number, stdDevThreshold = 3): boolean {
    const values = this.baselineMetrics.get(metricName);
    if (!values || values.length < 30) {
      return false; // Not enough data
    }

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) return false;

    const zScore = Math.abs((currentValue - mean) / stdDev);
    return zScore > stdDevThreshold;
  }

  getBaseline(metricName: string): { mean: number; stdDev: number } | null {
    const values = this.baselineMetrics.get(metricName);
    if (!values || values.length < 30) return null;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return { mean, stdDev };
  }
}

// Integration with AlertManager
class AnomalyAlertManager extends AlertManager {
  private anomalyDetector = new AnomalyDetector();

  protected async collectMetrics(name: string, queue: Queue): Promise<QueueMetrics> {
    const metrics = await super.collectMetrics(name, queue);

    // Update baselines
    this.anomalyDetector.updateBaseline(`${name}:waiting`, metrics.waiting);
    this.anomalyDetector.updateBaseline(`${name}:processingRate`, metrics.processingRate);
    this.anomalyDetector.updateBaseline(`${name}:failureRate`, metrics.failureRate);

    // Check for anomalies
    if (this.anomalyDetector.isAnomaly(`${name}:waiting`, metrics.waiting)) {
      this.emit('anomaly', {
        queue: name,
        metric: 'waiting',
        value: metrics.waiting,
        baseline: this.anomalyDetector.getBaseline(`${name}:waiting`),
      });
    }

    if (this.anomalyDetector.isAnomaly(`${name}:failureRate`, metrics.failureRate)) {
      this.emit('anomaly', {
        queue: name,
        metric: 'failureRate',
        value: metrics.failureRate,
        baseline: this.anomalyDetector.getBaseline(`${name}:failureRate`),
      });
    }

    return metrics;
  }
}
```

## Complete Example

Putting it all together:

```typescript
import { Redis } from 'ioredis';

const connection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
});

// Create alert manager
const alertManager = new AlertManager(connection);

// Add queues to monitor
alertManager.addQueue('emails');
alertManager.addQueue('orders');
alertManager.addQueue('notifications');

// Configure notification channels
alertManager.addChannel(
  new SlackChannel(process.env.SLACK_WEBHOOK_URL!)
);

alertManager.addChannel(
  new PagerDutyChannel(process.env.PAGERDUTY_ROUTING_KEY!, 'critical')
);

alertManager.addChannel(
  new EmailChannel(
    {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    },
    ['oncall@example.com'],
    'alerts@example.com'
  )
);

// Listen to events
alertManager.on('alert', (alert) => {
  console.log('Alert fired:', alert.name, alert.queue);
});

alertManager.on('resolved', (alert) => {
  console.log('Alert resolved:', alert.name, alert.queue);
});

// Start monitoring
alertManager.start(30000); // Check every 30 seconds

// API endpoint for alert status
app.get('/alerts', (req, res) => {
  res.json({
    active: alertManager.getActiveAlerts(),
    history: alertManager.getAlertHistory().slice(-100),
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  alertManager.stop();
});
```

## Best Practices

1. **Set appropriate thresholds** - Base on your application's normal behavior.

2. **Use cooldown periods** - Prevent alert fatigue from flapping conditions.

3. **Escalate by severity** - Page only for critical alerts.

4. **Include runbooks** - Link to remediation steps in alerts.

5. **Test your alerts** - Verify they fire and resolve correctly.

6. **Monitor the alerting system** - Alert if alerting fails.

7. **Review and tune regularly** - Adjust thresholds as behavior changes.

8. **Use anomaly detection** - Catch unexpected behavior.

9. **Aggregate related alerts** - Reduce noise from correlated issues.

10. **Document alert meanings** - Ensure team knows what each alert means.

## Conclusion

Effective alerting is essential for maintaining reliable BullMQ queues. By implementing threshold-based alerts, anomaly detection, and integrating with notification systems like Slack, PagerDuty, and email, you can quickly respond to issues before they impact users. Remember to tune your alerts based on your application's behavior and review them regularly.
