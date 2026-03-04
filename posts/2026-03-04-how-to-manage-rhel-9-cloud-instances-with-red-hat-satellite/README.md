# How to Manage RHEL 9 Cloud Instances with Red Hat Satellite

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Red Hat Satellite

Description: Step-by-step guide on manage rhel 9 cloud instances with red hat satellite with practical examples and commands.

---

Red Hat Satellite provides centralized management for RHEL systems across cloud environments. This guide covers managing RHEL 9 cloud instances with Satellite.

## Prerequisites

- Red Hat Satellite 6.x server deployed and configured
- RHEL 9 cloud instances on AWS, Azure, or GCP
- Network connectivity between instances and Satellite server
- Activation keys created in Satellite

## Register Cloud Instances to Satellite

Install the Satellite CA certificate on each RHEL 9 instance:

```bash
sudo dnf install -y \
  http://satellite.example.com/pub/katello-ca-consumer-latest.noarch.rpm
```

Register the system:

```bash
sudo subscription-manager register \
  --org="MyOrg" \
  --activationkey="rhel9-cloud-key" \
  --force
```

## Configure Content Views

Create a content view in Satellite for cloud instances:

```bash
hammer content-view create \
  --name "RHEL9-Cloud" \
  --organization "MyOrg"

hammer content-view add-repository \
  --name "RHEL9-Cloud" \
  --organization "MyOrg" \
  --product "Red Hat Enterprise Linux for x86_64" \
  --repository "Red Hat Enterprise Linux 9 for x86_64 - BaseOS RPMs 9"

hammer content-view add-repository \
  --name "RHEL9-Cloud" \
  --organization "MyOrg" \
  --product "Red Hat Enterprise Linux for x86_64" \
  --repository "Red Hat Enterprise Linux 9 for x86_64 - AppStream RPMs 9"

hammer content-view publish \
  --name "RHEL9-Cloud" \
  --organization "MyOrg"
```

## Create Host Groups for Cloud Instances

```bash
hammer hostgroup create \
  --name "RHEL9-AWS" \
  --organization "MyOrg" \
  --lifecycle-environment "Production" \
  --content-view "RHEL9-Cloud" \
  --architecture "x86_64" \
  --operatingsystem "RHEL 9"
```

## Configure Remote Execution

Enable remote execution on the Satellite server to run commands across cloud instances:

```bash
hammer job-invocation create \
  --job-template "Run Command - SSH Default" \
  --inputs command="dnf update -y" \
  --search-query "hostgroup = RHEL9-AWS"
```

## Apply Errata

List and apply errata to cloud instances:

```bash
hammer host errata list --host rhel9-cloud-01.example.com

hammer host errata apply \
  --host rhel9-cloud-01.example.com \
  --errata-ids RHSA-2025:1234
```

## Monitor Compliance

Use Satellite's OpenSCAP integration to scan cloud instances:

```bash
hammer policy create \
  --name "CIS-RHEL9-Cloud" \
  --scap-content-id 1 \
  --scap-content-profile-id 3 \
  --period weekly \
  --weekday monday
```

## Conclusion

Red Hat Satellite provides a single management plane for RHEL 9 cloud instances across multiple providers. Use content views, host groups, and remote execution to maintain consistency and compliance at scale.

