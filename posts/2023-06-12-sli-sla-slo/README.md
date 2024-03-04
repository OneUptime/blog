# What is SLA, SLI and SLO's?

Author: [devneelpatel](https://www.github.com/devneelpatel)

Tags: Learning Resource, Site Reliabiity Engineering

Description: Here's the difference between SLI, SLO, and SLA. 

### SLA - Service level agreement.

SLA basically means a Service Level Agreement. **It’s a formal agreement or a legal contract between you and your customers.** It basically describes the reliability of your product/service in a formal agreement.

> An example of this would be - our product will be online 99 percent of the time annually and if we fail to achieve that objective we will give 30% of your annual license fee back.

SLA’s also include penalties in the contract. That means if you fail to meet a certain level of reliability you basically do something for your customers.

### SLO - Service level objective.
Before we go on to SLO’s, SLA’s is a contract that includes a lot of components like it might include the reliability of an API, Home Page, Dashboard, etc. Each of these components has the reliability objectives that you want to achieve.

> An example of this would be - API will be up 99.99% of the time and the error rate of the API will be less than 0.01 percent in a year.

SLO’s basically describes the reliability goal of a particular resource in your organization or in your product. **Think of these as your internal objectives to meet your formal SLA.**

### SLI - Service level indicator.
SLI stands for service level indicator. It’s the status of your resources over a period of time. **This is what monitoring tools tells you.**

> This basically answers the question – What’s the uptime % of my API this quarter or this year.

### Conclusion

SLA is the legal contract with your customers. SLO is your internal goal. SLI is how has your resource actually been performing over a period of time.
