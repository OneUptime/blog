# Validation Summary: How to Set Up App Engine Firewall Rules to Restrict Access to Specific IP Ranges

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google App Engine
- App Engine firewall rules
- Google Cloud CLI
- Google Cloud Armor
- Identity-Aware Proxy
- Python subprocess automation
- CIDR notation

## Sources Consulted
- Google Cloud: Creating App Engine firewall rules: https://docs.cloud.google.com/appengine/docs/standard/creating-firewalls
- Google Cloud: Understanding the App Engine firewall, standard environment: https://docs.cloud.google.com/appengine/docs/standard/understanding-firewalls
- Google Cloud: Understanding the App Engine firewall, flexible environment: https://docs.cloud.google.com/appengine/docs/flexible/understanding-firewalls
- Google Cloud SDK reference: gcloud app firewall-rules create: https://cloud.google.com/sdk/gcloud/reference/app/firewall-rules/create
- Google Cloud SDK reference: gcloud app firewall-rules update: https://docs.cloud.google.com/sdk/gcloud/reference/app/firewall-rules/update
- App Engine Admin API: apps.firewall.ingressRules resource: https://docs.cloud.google.com/appengine/docs/admin-api/reference/rest/v1/apps.firewall.ingressRules
- Google Cloud Armor rules language reference: https://cloud.google.com/armor/docs/rules-language-reference
- Google Cloud Identity-Aware Proxy documentation: https://docs.cloud.google.com/iap/docs

## Issues Found
- The `gcloud app firewall-rules create` examples used `--priority`. The App Engine firewall CLI takes priority as a positional argument, so each create command was updated to put the priority immediately after `create`.
- The Python automation example also used `--priority`. It was updated to pass `str(priority)` as the positional priority argument.
- The post said an existing rule's priority could be updated. App Engine firewall rule priority cannot be edited after creation; the post now says to delete and recreate the rule to change priority.
- The staging example described `0.1.0.1` and `0.1.0.2` as App Engine health check IPs. Google Cloud documents these as App Engine internal service IPs for Cloud Scheduler/App Engine HTTP, Cloud Tasks, and Cron behavior, with environment-specific bypass behavior. The example and explanation were corrected.
- The staging example used a specific Google IP range for "Cloud Build health checks" without support from the App Engine firewall docs. It was replaced with a documentation-reserved example IP for a known CI/CD egress address.
- The post claimed blocked requests never consume instance hours. Because the official firewall docs state that denied requests do not reach app handlers but do not make a billing guarantee in that form, the wording was narrowed to the documented behavior.

## Review Notes
- App Engine standard and flexible environments differ for some internal service traffic. In standard, Cloud Scheduler/App Engine HTTP, Cloud Tasks, and warmup requests can bypass a deny default rule; in flexible, relevant internal IPs may need explicit allow rules.
- The App Engine firewall is application-wide and applies to all resources of the App Engine application, so per-service or per-version access control should be handled with a different mechanism such as IAP or application-level authorization.
