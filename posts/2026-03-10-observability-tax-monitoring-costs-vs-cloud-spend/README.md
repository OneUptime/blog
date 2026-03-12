# The Observability Tax: When Monitoring Costs More Than Infrastructure

Author: [mallersjamie](https://www.github.com/mallersjamie)

Tags: Observability, Monitoring, DevOps, Open Source

Description: Engineering teams are spending more on monitoring tools than on the cloud infrastructure they monitor. Here is how we got here, and what you can do about it.

Something strange happened in the last few years. The tools we use to *watch* our infrastructure started costing more than the infrastructure itself.

This is not hyperbole. Talk to any platform engineering team running a mid-size SaaS product, and you will hear the same story: their combined monitoring, logging, APM, incident management, and status page bill has quietly crept past their compute spend.

The industry has a name for it now: the **observability tax**.

## The Math Nobody Wants to Do

Let's walk through a realistic scenario. You are running a B2B SaaS product with 50 engineers, moderate traffic, and the standard microservices architecture that everyone adopted between 2018 and 2022.

Here is what a typical monitoring stack costs:

| Tool | What It Does | Monthly Cost |
|------|-------------|-------------|
| Datadog Infrastructure | Host and container monitoring | $3,450 (150 hosts x $23/host) |
| Datadog APM | Distributed tracing | $5,925 (150 hosts x $39.50/host) |
| Datadog Log Management | Log indexing and search | $4,500 (30M events/day, 15-day retention) |
| PagerDuty | On-call and incident response | $2,050 (50 users x $41/user) |
| Atlassian Statuspage | Public status page | $399 (Business plan) |
| Sentry | Error tracking | $320 (Business plan) |
| Pingdom | Uptime monitoring | $249 (Advanced plan) |

**Total: $16,893 per month. $202,716 per year.**

Now compare that to what you are actually monitoring. A fleet of 150 hosts on AWS, even with generous specs, runs around $10,000 to $15,000 per month in compute. Add databases, networking, and storage, and you might hit $25,000.

You are spending nearly 70% of your infrastructure budget just to *observe* your infrastructure. For larger organizations ingesting terabytes of logs, the ratio flips entirely: monitoring costs exceed infrastructure costs.

## How We Got Here

This did not happen overnight. It was a slow accumulation of reasonable decisions that added up to an unreasonable outcome.

**The per-unit pricing trap.** Most observability vendors price by the unit: per host, per GB ingested, per span traced, per user seated. Each unit seems cheap in isolation. $23 per host? Totally reasonable. But units multiply. You containerize your app and suddenly one server becomes 15 containers. You adopt microservices and your trace volume increases tenfold. You add structured logging because that is what the blog posts told you to do, and your log volume doubles every quarter.

The pricing model is designed so that doing the right engineering thing (more granular services, better instrumentation, richer logging) directly increases your bill.

**The multi-vendor stack.** No single vendor covers everything well enough, so teams end up with a Frankenstein stack. Datadog for metrics and traces. PagerDuty for on-call. StatusPage for public status. Sentry for errors. Pingdom for synthetic checks. Each vendor solves one piece, each has its own pricing model, and the total creeps up because nobody is looking at the aggregate number.

**The data gravity problem.** Once your logs are in Datadog, your dashboards are in Datadog, and your alerts are in Datadog, switching costs are enormous. Vendors know this. They can raise prices 15% annually and most teams will absorb it rather than face a six-month migration project.

**Vendor lock-in disguised as convenience.** Proprietary query languages, custom agents, non-standard data formats. The more you invest in one vendor's ecosystem, the harder it becomes to leave. This is not accidental. It is the business model.

## The Hidden Costs Nobody Tracks

The line items above are just the direct costs. There are others:

**Context switching costs.** Your on-call engineer gets a PagerDuty alert, opens Datadog to investigate, checks logs in a separate tab, opens Sentry to see if it correlates with an error spike, then updates the status page manually. Five tools, five browser tabs, five mental models. That context switching during an incident adds minutes to your MTTR, and minutes during outages cost real money.

**Integration maintenance.** Keeping five or six monitoring tools synchronized is a job in itself. Someone has to maintain the PagerDuty-Datadog integration, ensure Sentry alerts route to the right Slack channel, keep the StatusPage automation working. This is toil that produces zero customer value.

**Sampling and data loss.** When the bill gets too high, teams start sampling. Keep only 10% of traces. Reduce log retention to 3 days. Drop debug-level logs entirely. This saves money but creates blind spots. And blind spots during incidents are exactly how small problems become big outages.

**The fear tax.** Engineers are afraid to instrument new services because they know it will increase the monitoring bill. This is perverse. Observability should be something you add freely to improve reliability, not something you ration like a scarce resource.

## What Actually Needs to Change

The observability tax is not inevitable. It exists because the industry consolidated around a few vendors with pricing models optimized for their revenue growth, not your operational efficiency.

Here is what the alternative looks like:

### 1. Consolidate Your Stack

The single biggest cost driver is running multiple tools that overlap in functionality. A modern observability platform should handle monitoring, APM, logs, incident management, status pages, and on-call in one place. Not as a bundle of acquired products duct-taped together, but as a single coherent system where everything shares context.

When your traces, logs, metrics, incidents, and status pages live in the same platform, you eliminate integration maintenance, reduce context switching, and remove the need for most of the point solutions in your stack.

### 2. Own Your Data

Open source observability tools let you run the stack on your own infrastructure. Your data stays in your databases. You pay for compute and storage at commodity cloud prices, not at observability vendor markup.

The markup is significant. Cloud storage costs roughly $0.02 per GB per month. Observability vendors charge $0.10 to $3.00 per GB for ingestion, indexing, and retention. That is a 5x to 150x markup. When you own the stack, you pay the $0.02.

### 3. Stop Paying Per Seat for Incident Management

PagerDuty charges per user. This creates an incentive to limit who has access to the on-call system. But reliability improves when *more* people have visibility into incidents, not fewer. Per-seat pricing for incident management is a tax on organizational transparency.

### 4. Reject Sampling as a Cost Control Measure

If your observability vendor forces you to choose between complete data and a manageable bill, the vendor's pricing model is broken. You should be able to ingest all your telemetry data, all the time, without worrying about a surprise bill at the end of the month.

### 5. Evaluate Total Cost, Not Unit Cost

Stop comparing individual line items ($23 per host looks cheap!) and start comparing the total annual spend across your entire monitoring stack. Then compare that to what an open source alternative would cost you in compute, even including the engineering time to run it.

For most mid-size teams, the math strongly favors self-hosted open source. You trade vendor bills for compute costs, and the savings are typically 70-90%.

## The Shift Is Already Happening

The observability market is going through the same transition that databases went through a decade ago. Companies spent years paying Oracle and Microsoft for proprietary databases before PostgreSQL and MySQL became good enough for production. Today, open source databases power the majority of new applications.

The same pattern is playing out in observability. Open source projects are reaching feature parity with commercial vendors. Self-hosting has gotten dramatically easier with containerization and Kubernetes. And the cost differential is too large to ignore, especially for bootstrapped companies and mid-market teams that cannot justify six-figure monitoring bills.

The companies that make this shift early will have a structural cost advantage. When your competitor spends $200K per year on monitoring and you spend $20K for the same coverage, that is $180K you can invest in product, hiring, or growth.

## The Bottom Line

If you have not audited your total observability spend recently, do it this week. Add up every monitoring, logging, tracing, incident management, status page, and error tracking tool your team uses. Compare that number to your infrastructure spend.

If the ratio surprises you, you are not alone. And you do not have to accept it.

The observability tax is a choice, not a law of nature. The tools exist to cut it by 80% or more. The question is whether your team has the appetite to make the switch.

For most engineering leaders who actually run the numbers, the answer becomes obvious pretty quickly.
