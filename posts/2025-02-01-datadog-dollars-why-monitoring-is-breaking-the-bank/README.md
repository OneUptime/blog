# Datadog Dollars: Why Your Monitoring Bill Is Breaking the Bank

Author: [devneelpatel](https://www.github.com/devneelpatel)

Tags: Observability, Datadog

Description: Have you ever opened your monitoring bill and felt your heart skip a beat? You're not alone. In the world of digital infrastructure, many companies are experiencing sticker shock when they see their Datadog invoices. Let's unpack why your monitoring bill might be breaking the bank and explore how you can rein it back in.

Have you ever opened your monitoring bill and felt your heart skip a beat? You're not alone. In the world of digital infrastructure, many companies are experiencing sticker shock when they see their Datadog invoices. Let's unpack why your monitoring bill might be breaking the bank and explore how you can rein it back in.

### The Allure of Datadog

Datadog has positioned itself as a go-to solution for infrastructure monitoring, application performance, log management, and more. Its comprehensive features act like a Swiss Army knife for DevOps teams. The convenience of having everything under one roof is compelling, but it can also lead to costs piling up in unexpected ways.

### **Why the Bill Balloons**

#### **Per-Host Pricing Model**

Datadog charges based on the number of hosts and the services you monitor. In dynamic environments, especially those leveraging microservices and auto-scaling, the number of hosts can fluctuate rapidly. It's akin to paying rent for every room in a hotel, even if you're only staying in a few.

**Example:**

Consider a retail company that experiences massive traffic spikes during the holiday season. To handle the load, they use auto-scaling in Kubernetes to spin up additional pods. What started as 50 hosts can quickly escalate to 500 during peak hours. Datadog counts each of these instances towards your bill. So, a temporary surge to ensure smooth customer experience ends up inflating monitoring costs significantly.

**Illustration:**

```
Normal Operation: 50 hosts x $15/host = $750/month
Peak Season: 500 hosts x $15/host = $7,500/month
```

Suddenly, the monthly monitoring cost jumps by tenfold, all due to auto-scaling.

#### **High Cardinality Metrics**

The platform encourages you to send a plethora of custom metrics. While granular data is valuable, tracking every possible metric can be like trying to count every grain of sand on a beach. Each additional metric increases your bill, and high cardinality (metrics with many unique tag combinations) can cause costs to skyrocket.

**Example:**

Imagine you're tagging your application's metrics with user IDs to track performance per user. If you have a million users, that's a million unique tags. Datadog treats each unique tag combination as a separate time series. This high cardinality overwhelms the system and exponentially increases costs.

**Scenario:**

- **Metric:** `response_time`
- **Tags:** `region`, `user_id`

With 5 regions and 1 million user IDs:

```
Total Time Series = 1 metric x 5 regions x 1,000,000 user_ids = 5,000,000 time series
```

Managing five million time series for a single metric is both impractical and expensive.

#### **Log Management Costs**

Logs are essential for debugging and compliance but can generate massive volumes of data. Datadog's pricing for log ingestion and retention can be steep. Imagine saving every single receipt from your grocery shopping; over time, storage and management become overwhelming and costly.

**Example:**

A fintech startup logs every transaction detail for auditing purposes. They generate about 500 GB of logs daily. Datadog's pricing model charges per GB ingested and retained.

**Cost Breakdown:**

```
Daily Ingestion: 500 GB x $0.10/GB = $50/day
Monthly Ingestion: $50/day x 30 days = $1,500/month
Retention Costs (for 15 days): Additional fees apply
```

Over a year, that's $18,000 just for log ingestion, not including retention surcharges. This can be a hefty expense for a startup.

#### **Premium Features Add Up**

Features like APM (Application Performance Monitoring), RUM (Real User Monitoring), and Synthetic Monitoring offer deep insights but come with additional fees. It's the equivalent of adding premium channels to your cable subscription; each one enhances your experience but increases the monthly bill.

**Example:**

A media company decides to implement:

- **APM** to trace backend services.
- **RUM** to analyze user interactions.
- **Synthetic Monitoring** to simulate user journeys.

**Cost Addition:**

- **APM:** 50 instrumented hosts x $31/host = $1,550/month
- **RUM:** 10 million events x $0.01/event = $100,000/month
- **Synthetic Tests:** 1,000,000 API tests x $0.0007/test = $700/month

**Total Premium Features Cost:** $102,250/month

These features provide valuable insights but can drastically increase expenses if not carefully managed.

#### **Over-Reliance on Default Settings**

Datadog's default configurations are designed for broad applicability, not cost efficiency. Without fine-tuning, you might be collecting and storing more data than necessary. It's like leaving all the lights on in your house all the time—convenient but expensive.

**Example:**

By default, Datadog might retain all logs for 15 days which could increase cost. Consider lower retention for non-essential logs / info logs and only choose to retain error logs. 

### **Beyond the Bill: Making Monitoring Work for You**

**Preventing Bill Shock**

- **Set Up Budget Alerts:**

Use Datadog's budgeting tools to alert you when you're approaching cost thresholds. This proactive approach helps prevent unexpected expenses.

- **Data Sampling and Aggregation:**

Instead of sending every single data point, use sampling methods. Aggregate data at the source to reduce the volume transmitted to Datadog.

**Explore Cost-Effective Practices**

- **Filter Unnecessary Data:**

Implement log filters to exclude non-essential logs. For instance, you might exclude health check logs or static asset requests that don't provide significant insight.

- **Customize Data Retention:**

Define retention policies based on the importance of data. Critical error logs might be stored longer than routine access logs.

**Leverage Open-Source Tools**

- **Using OneUptime**

OneUptime offers a cost-effective alternative to Datadog, providing essential monitoring features without the premium price tag and it's 100% open-source. It can be a viable solution for organizations looking to optimize monitoring costs or moving towards a more open-source ecosystem for observability. Spend less on monitoring and more on innovation and orgnizations can choose to self-host their data, if their data is sensitive which was not possible with Datadog. Please check out [OneUptime](https://oneuptime.com) and give it a try!


### **The Bigger Picture: Is Datadog Right for You?**

**Assess Your Actual Needs**

- **Feature Utilization:**

List out the Datadog features you actively use. If you're only leveraging basic monitoring, a simpler tool might suffice.

- **Scalability Considerations:**

If your environment scales frequently, consider monitoring solutions with pricing models better suited to dynamic infrastructures. Companies like OneUptime offer transparent pricing that scales with your needs. They only charge based on the number of data you ingest vs the number of hosts you run observability on.


### **Your Next Steps**

- **Audit Your Current Setup:**

Schedule a comprehensive review of your Datadog configuration and usage.

- **Engage Stakeholders:**

Involve your DevOps team, finance department, and other stakeholders to align on monitoring needs and budget constraints.

- **Explore and Experiment:**

Don't hesitate to trial other monitoring tools. Many are open-source, offer free tiers or trial periods to evaluate their suitability.

Remember, the goal is to achieve optimal observability without compromising your financial health. By taking control of your monitoring strategy, you ensure that you're investing wisely in your infrastructure's future.


### **Strategies to Control Costs**

#### **Audit and Optimize Metrics**

Conduct regular reviews of the metrics you're collecting. Identify what's essential for your monitoring goals and trim the rest. Use aggregation and sampling to reduce the volume without losing critical insights.

#### **Adjust Data Retention Policies**

Customize retention periods for different types of data. Maybe you need logs from the past week, not the past year. Shortening retention can significantly cut costs.

#### **Leverage Tags Wisely**

Be strategic with tagging. While tags help in filtering and analyzing data, excessive or unnecessary tags increase metric cardinality and thus costs.

#### **Negotiate with Datadog**

Everyone (mostly) is open to negotiation. If you're a significant user, engage with Datadog's sales team. There might be room for custom pricing or enterprise agreements that provide better value.

### Final Thoughts

Monitoring is not a luxury; it's a necessity. But it shouldn't consume a disproportionate share of your IT budget. By understanding where costs originate and actively managing your usage, you can harness the power of Datadog (or any monitoring tool) without financial strain. Remember, the goal is to optimize your monitoring strategy, not your monitoring bill and keep your infrastructure healthy without breaking the bank.