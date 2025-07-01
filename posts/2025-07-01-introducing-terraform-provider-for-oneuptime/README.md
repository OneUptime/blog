# Introducing the OneUptime Terraform Provider: Infrastructure as Code for Complete Observability

Author: [devneelpatel](https://www.github.com/devneelpatel)

Tags: Infrastructure as Code, Terraform, DevOps, Automation

Description: We're excited to announce the release of the official OneUptime Terraform provider! Now you can manage your entire observability infrastructure as code, from uptime monitors and status pages to incident management workflows and on-call schedules.

We're thrilled to announce the release of the **official OneUptime Terraform provider**! This marks a significant milestone in our mission to make observability infrastructure management as seamless and scalable as possible. Now you can define, deploy, and manage your entire OneUptime setup using Infrastructure as Code (IaC) principles.

## Why Terraform + OneUptime?

As your organization grows, manually configuring monitoring, incident management, and observability tools becomes a bottleneck. Teams need:

- **Reproducible deployments** across environments
- **Version-controlled configurations** for audit trails
- **Automated provisioning** of monitoring infrastructure
- **Consistent setups** across multiple projects and teams

The OneUptime Terraform provider solves these challenges by bringing Infrastructure as Code to your observability stack.

## What You Can Manage with the Provider

Our Terraform provider covers the complete OneUptime feature set, allowing you to manage:

### 🔍 **Monitoring & Alerting**
- Uptime monitors for websites, APIs, and services
- Custom alert rules and escalation policies
- Monitor groups and probe configurations
- Performance thresholds and SLA definitions

### 📊 **Status Pages & Communication**
- Status pages with custom branding
- Service status indicators and maintenance windows
- Subscriber management and notification templates
- Custom domains and SSL certificates

### 🚨 **Incident Management**
- Incident templates and workflows
- Severity levels and response procedures
- Team assignments and escalation rules
- Post-incident review processes

### 👥 **Team & Access Management**
- Team structures and member assignments
- Role-based permissions and access controls
- On-call schedules and rotation policies
- API keys and service integrations

### 📈 **Observability Infrastructure**
- Log collection and retention policies
- Metrics and telemetry configurations
- Dashboard layouts and visualizations
- Workflow automations and integrations

## Getting Started

Setting up the OneUptime Terraform provider is straightforward. Here's a quick example:

```terraform
terraform {
  required_providers {
    oneuptime = {
      source  = "oneuptime/oneuptime"
      version = "1.0.0"
    }
  }
}

provider "oneuptime" {
  api_key = var.oneuptime_api_key
  oneuptime_url    = "https://oneuptime.com"  # Change this to your OneUptime instance URL if you are self-hosting
}

# Set up uptime monitoring
resource "oneuptime_monitor" "api_monitor" {
  name         = "API Health Check"
  description  = "Monitor main API endpoint"
  monitor_type = "Manual"

}

# Configure status page
resource "oneuptime_status_page" "public" {
  name        = "Service Status"
  description = "Public status page for our services"
}
```


## Advanced Features

### **State Management**
The provider maintains state for all OneUptime resources, enabling:
- Drift detection and correction
- Incremental updates and rollbacks
- Dependency management between resources

### **Import Existing Resources**
Already have OneUptime configurations? Import them into Terraform:

```bash
terraform import oneuptime_monitor.existing_monitor monitor-id-123
terraform import oneuptime_status_page.existing_page status-page-id-456
```

### **Integration with CI/CD**
Integrate with your deployment pipelines for automated infrastructure updates:

```yaml
# GitHub Actions example
- name: Deploy OneUptime Infrastructure
  run: |
    terraform init
    terraform plan
    terraform apply -auto-approve
  env:
    ONEUPTIME_API_KEY: ${{ secrets.ONEUPTIME_API_KEY }}
```

## Benefits You'll Experience

### **🚀 Faster Setup**
Deploy complete monitoring infrastructure in minutes, not hours. New environments spin up with identical observability configurations.

### **🔒 Consistent Security**
Apply security policies and access controls uniformly across all environments using code-defined configurations.

### **📋 Audit Trail**
Every change to your observability infrastructure is version-controlled, providing complete visibility into who changed what and when.

### **🔄 Disaster Recovery**
Quickly rebuild your entire monitoring setup from code if needed. Your infrastructure configuration becomes your disaster recovery plan.

### **🏗️ Scalability**
As your infrastructure grows, your monitoring scales with it. Add new services, teams, and environments using proven patterns.

## Community and Support

The OneUptime Terraform provider is open source and available on the [Terraform Registry](https://registry.terraform.io/providers/oneuptime/oneuptime). Our documentation includes:

- **Complete resource reference** with all available options
- **Example configurations** for common use cases
- **Migration guides** for existing OneUptime users
- **Best practices** for managing observability infrastructure


## Get Started Today

Ready to bring Infrastructure as Code to your observability stack? Here's how to get started:

1. **Check out the [provider documentation](https://registry.terraform.io/providers/oneuptime/oneuptime)**
2. **Explore [example configurations](https://github.com/oneuptime/terraform-provider-oneuptime/tree/main/examples)**
3. **Join our community** to share feedback and best practices

The OneUptime Terraform provider represents our commitment to making observability infrastructure as reliable and maintainable as the applications it monitors. By treating your monitoring configuration as code, you're building a foundation for scalable, reliable operations.

Start small, think big, and let Infrastructure as Code power your observability strategy.

---

*Have questions about the OneUptime Terraform provider? [Join our community](https://oneuptime.com/support) or [check out the documentation](https://oneuptime.com/docs) to get started.*
