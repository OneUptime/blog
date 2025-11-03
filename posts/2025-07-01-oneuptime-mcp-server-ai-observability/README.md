# Introducing OneUptime MCP Server: Bringing AI-Native Observability to Your Workflow

Author: [devneelpatel](https://www.github.com/devneelpatel)

Tags: MCP, AI, Model Context Protocol, Open Source, Observability, Automation

Description: OneUptime now provides a production-ready Model Context Protocol (MCP) server that gives AI assistants direct access to your observability infrastructure. Create incidents, query logs, manage monitors, and automate operations- all through natural language conversations with AI.

The future of observability isn't just about dashboards and alerts- it's about **conversational operations**. Today, we're excited to introduce the **OneUptime MCP Server**, a production-ready implementation of the Model Context Protocol that brings AI-native observability to your development workflow.

## What is the Model Context Protocol?

The Model Context Protocol (MCP) is an open standard that enables AI assistants to securely connect to external systems and services. Think of it as a bridge between AI models and real-world tools- allowing AI assistants to take actions, query data, and automate complex workflows on your behalf.

With MCP, instead of copy-pasting error logs into ChatGPT or manually creating incident reports, you can simply ask your AI assistant to:

- "Check the status of our production API monitors"
- "Create a critical incident for the database outage"
- "Show me error logs from the last hour"


## Why OneUptime + MCP = Game Changer

As an **open source observability platform**, OneUptime's integration with MCP represents a fundamental shift toward **AI-first operations**:

### **🤖 Natural Language Operations**
Replace complex CLI commands and dashboard navigation with simple conversations:

```
Human: "Are there any incidents in our production project right now?"

AI: Let me check your OneUptime incidents...
[Queries OneUptime via MCP]
I found 2 open incidents in your production project:
- Critical: Database connection timeout (started 15 minutes ago)
- Warning: High memory usage on web servers (started 2 hours ago)

Would you like me to get more details or take any actions?
```


### **🌊 Workflow Automation**
Chain multiple operations together through natural conversation:

```
Human: "Something's wrong with our checkout service"

AI: I'll help you investigate. Let me:
1. Check monitors for the checkout service
2. Look for recent incidents
3. Query error logs from the last 30 minutes
4. Create an incident if needed

[Executes multiple MCP calls]

I found elevated error rates and created incident #INC-2024-001 
"Checkout Service Degradation" with high severity. The incident 
has been assigned to the on-call engineer.
```

## Comprehensive OneUptime Integration

The MCP server provides **complete access** to OneUptime's functionality through AI conversations:

### **📊 Monitoring & Alerts**
- **Monitor Management**: Create, update, and query monitors across all types
- **Alert Operations**: Acknowledge, resolve, and escalate alerts
- **Status Checking**: Real-time status of services and infrastructure
- **Probe Management**: Configure and monitor global probe locations

```
AI Tools Available:
- oneuptime_create_monitor
- oneuptime_list_onitors  
- oneuptime_get_monitor
- oneuptime_update_monitor
- oneuptime_delete_monitor
- oneuptime_count_monitors
```

### **🚨 Incident Management**
- **Incident Lifecycle**: Create, update, and resolve incidents
- **Team Coordination**: Assign incidents and manage escalations
- **Communication**: Add notes, updates, and status changes
- **Post-Mortems**: Document resolution and lessons learned

```
Example Conversation:
Human: "Create a critical incident for our API being down"

AI: I'll create a critical incident for you. Let me set this up:

[Creates incident via MCP]

✅ Created incident INC-2024-001 "API Service Outage"
- Severity: Critical
- Status: Created
- Assigned to: On-call team
- Created: 2024-07-01 14:30 UTC

The incident has been automatically escalated to your on-call policy.
```

### **📈 Log Analysis & Metrics**
- **Log Querying**: Search and filter logs with natural language
- **Metric Analysis**: Query performance data and trends
- **Trace Investigation**: Analyze distributed traces and spans
- **Error Investigation**: Deep-dive into exceptions and errors

```
Human: "Show me all error logs from the checkout service in the last hour"

AI: [Queries logs via MCP]
Found 47 error logs from checkout service in the last hour:

Top errors:
- Database timeout (23 occurrences)
- Payment gateway 503 (12 occurrences)  
- Redis connection failed (8 occurrences)
- Session validation error (4 occurrences)

Would you like me to create an incident or investigate any specific error?
```

### **👥 Team & Project Management**
- **User Management**: Add, update, and manage team members
- **Permission Control**: Configure roles and access levels
- **Project Organization**: Manage multiple projects and environments
- **On-Call Scheduling**: Update schedules and handle overrides

## Real-World Use Cases

### **1. Intelligent Incident Response**
```
Human: "Our customers are reporting the website is slow"

AI: Let me investigate this issue for you:

1. Checking website monitors... ✅
   - Response time: 2.3s (normal: 0.8s)
   - Availability: 98.2% (down 1.8%)

2. Looking for related incidents... ✅
   - Found 1 similar incident from last month

3. Querying recent logs... ✅
   - High database query times detected
   - Memory usage at 89% on web servers

4. Creating incident... ✅
   - Created INC-2024-002 "Website Performance Degradation"
   - Assigned to platform team
   - Added investigation findings

Recommended actions:
- Scale web servers
- Investigate database performance
- Monitor response times closely
```

### **2. Proactive Monitoring Setup**
```
Human: "We're launching a new microservice called 'user-auth' at https://api.example.com/auth/health. Can you set up monitoring for it?"

AI: I'll set up comprehensive monitoring for your new user-auth service:

1. Creating health check monitor... ✅
2. Setting up performance monitoring... ✅
3. Configuring error rate alerts... ✅
4. Adding to production status page... ✅

Your user-auth service is now fully monitored with:
- Health endpoint checks every 30 seconds
- Response time alerts if > 2 seconds
- Error rate alerts if > 5%
- Automatic incident creation for failures

The service is also visible on your public status page.
```

### **3. Operational Reporting**
```
Human: "Give me a summary of our infrastructure health this week"

AI: Here's your infrastructure health summary for this week:

📊 **Monitors**: 47 active (2 new this week)
- Uptime: 99.8% average
- Response time: 0.7s average
- 3 brief outages (total: 14 minutes)

🚨 **Incidents**: 8 total (5 resolved, 3 ongoing)
- Critical: 1 (database issue - resolved)
- High: 2 (API rate limiting - ongoing)
- Medium: 5 (minor performance issues)

📈 **Performance Trends**:
- Database queries 15% slower than last week
- Error rates down 8% overall
- Memory usage increased 12%

🔧 **Recommendations**:
- Consider database optimization
- Monitor memory usage trends
- Review API rate limiting strategy
```


## Getting Started

### **Installation**

```bash
# Clone OneUptime repository
git clone https://github.com/oneuptime/oneuptime
cd oneuptime/MCP

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your OneUptime API key

# Build and run
npm run build
npm start
```

### **Configuration**
```bash
# .env configuration
ONEUPTIME_API_KEY=your_api_key_here
ONEUPTIME_URL=https://oneuptime.com  # Optional
```

### **Integration with AI Assistants**
The MCP server works with any MCP-compatible AI assistant:

```bash
# For Claude Desktop
{
  "mcpServers": {
    "oneuptime": {
        "command": "oneuptime-mcp",
        "env": {
          "ONEUPTIME_API_KEY": "oneuptime-api-key",
          "ONEUPTIME_URL": "https://oneuptime.com"  # Optional
        }
    }
  }
}
```

## The Future of AI-Driven Operations

The OneUptime MCP server represents more than just an integration- it's a **vision of AI-native operations** where:

### **🗣️ Natural Language is the Interface**
No more memorizing CLI commands or navigating complex dashboards. Describe what you want, and AI handles the implementation.

### **🤝 AI Becomes Your Operations Partner**
AI assistants become knowledgeable team members who can investigate issues, take actions, and learn from your operational patterns.

### **⚡ Operations Become Conversational**
Complex operational workflows become as simple as having a conversation with a knowledgeable colleague.

### **🔄 Continuous Learning**
AI assistants can learn from operational patterns, suggest optimizations, and proactively identify potential issues.

## Open Source Innovation

As with everything OneUptime builds, the MCP server is **completely open source**:

- **Full source code** available in our GitHub repository
- **Apache 2.0 license** for maximum flexibility
- **Community contributions** welcome and encouraged
- **Transparent development** with public roadmaps

This open approach enables:
- **Community extensions** for specialized use cases
- **Custom implementations** for specific environments
- **Integration examples** for other observability tools
- **Collaborative improvements** from the community

## What's Next?

The OneUptime MCP server is just the beginning. We're actively working on:

### **Enhanced AI Capabilities**
- **Intelligent incident correlation** across multiple data sources
- **Predictive alerting** based on pattern recognition
- **Automated remediation** for common issues
- **Smart escalation** based on context and urgency

### **Expanded Integrations**
- **Multi-platform support** for various AI assistants
- **Webhook integrations** for real-time updates
- **Custom tool development** framework
- **Plugin ecosystem** for community extensions

### **Advanced Workflows**
- **Multi-step operations** with approval workflows
- **Conditional logic** for complex automation
- **Cross-platform coordination** with other tools
- **Audit trails** for all AI-driven actions

## Join the AI-Native Operations Revolution

The OneUptime MCP server is available today and ready for production use. Whether you're managing a handful of services or a complex microservices architecture, AI-driven operations can transform how your team works.

**Get Started Today:**

1. **[Download the MCP server](https://github.com/oneuptime/oneuptime/tree/master/MCP)** from our GitHub repository
2. **Configure your environment** with your OneUptime API key
3. **Connect your AI assistant** using MCP protocol
4. **Start conversing** with your observability infrastructure

The future of operations is conversational, intelligent, and open source. With OneUptime's MCP server, that future is available today.

---

*Ready to transform your operations with AI? [Check out our MCP server documentation](https://github.com/oneuptime/oneuptime/tree/master/MCP) and [join our community](https://oneuptime.com/support) to share your experiences.*

**Related Reading:**

- [Introducing the OneUptime Terraform Provider: Infrastructure as Code for Complete Observability](https://oneuptime.com/blog/post/2025-07-01-introducing-terraform-provider-for-oneuptime/view)
- [OneUptime Embraces Open Standards: Complete OpenAPI 3.0 Specification Now Available](https://oneuptime.com/blog/post/2025-07-01-oneuptime-openapi-specification-open-standards/view)
- [Monitoring LLM Application(s) with Openlit and OneUptime](https://oneuptime.com/blog/post/2024-09-13-monitoring-llm-with-openlit-and-oneuptime/view)
