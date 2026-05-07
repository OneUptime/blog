# Validation Summary: How to Move Namespaces Between Projects in Rancher

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Rancher Manager
- Kubernetes namespaces
- Kubernetes RBAC
- `kubectl`
- Rancher v3 API
- Terraform Rancher2 provider
- Bash
- `jq`

## Sources Consulted
- Rancher docs: Namespaces, especially "Moving Namespaces to Another Project" - https://ranchermanager.docs.rancher.com/v2.9/how-to-guides/new-user-guides/manage-namespaces
- Rancher docs: Projects workflow API, including creating a namespace in a project with `field.cattle.io/projectId` - https://ranchermanager.docs.rancher.com/api/workflows/projects
- Rancher docs: How Resource Quotas Work in Rancher Projects - https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/manage-projects/manage-project-resource-quotas/about-project-resource-quotas
- Rancher docs: Previous v3 Rancher API Guide - https://ranchermanager.docs.rancher.com/v2.14/api/v3-rancher-api-guide
- Rancher docs: Rancher Webhook reference, including permissions around updating `field.cattle.io/projectId` - https://ranchermanager.docs.rancher.com/reference-guides/rancher-webhook
- Kubernetes docs: `kubectl annotate` - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_annotate
- Kubernetes docs: `kubectl auth can-i` - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i
- Terraform provider docs: `rancher2_namespace` resource - https://github.com/rancher/terraform-provider-rancher2/blob/main/docs/resources/namespace.md
- Rancher source: namespace `move` action and quota restriction - https://github.com/rancher/rancher/blob/main/pkg/api/norman/customization/namespace/namespace.go
- Rancher source: namespace label reconciliation from `field.cattle.io/projectId` - https://github.com/rancher/rancher/blob/main/pkg/controllers/managementagent/nslabels/labels.go
- Rancher source: project quota `UsedLimit` definition and recalculation on moves - https://github.com/rancher/rancher/blob/main/pkg/apis/management.cattle.io/v3/resource_quota_types.go
- Rancher source: project quota recalculation logic during namespace moves - https://github.com/rancher/rancher/blob/main/pkg/controllers/managementuser/resourcequota/resource_quota_calculate_used.go

## Issues Found
- The `kubectl` move instructions incorrectly required manually updating the `field.cattle.io/projectId` label. I removed that step because Rancher documents the annotation as the supported assignment mechanism, and Rancher reconciles the label from that annotation.
- The Rancher API example used a `PUT` to update the namespace resource with `projectId`. I replaced it with the supported Rancher v3 action flow: discover the namespace's `move` action URL and `POST` `{"projectId":"..."}` to that action.
- The quota behavior was inaccurate. The draft said a move into a quota-constrained project succeeds and only blocks later resource creation. Rancher docs and source show that Rancher blocks moves into projects that already have a project resource quota configured. I corrected the explanation, commands, and best-practice guidance.
- The draft implied quota effects were always a simple transfer from old project to new project. I corrected this to reflect Rancher's actual behavior: moving from a quota-enabled project to a project with no project quota removes the namespace's inherited project quota.
- The Step 8 command was described as checking who can access the namespace, but it only inspects namespace rolebindings. I reworded that description to match what the command actually shows.
- The wording around UI moves and RBAC timing was too absolute. I softened it to reflect Rancher's controller-driven reconciliation behavior.

## Review Notes
- Rancher still documents namespace moves, but projects are de-emphasized in newer UI versions. The post remains technically relevant.
- Rancher v2.8.0 introduced RK-API, while the older v3 API remains available. The corrected API example uses the still-supported v3 action model and follows Rancher's guidance to use action URLs from the resource's `actions` map.
- The post's `Rancher v2.7+` prerequisite remains broadly reasonable, but the validation was performed against current Rancher documentation and source available on 2026-05-07 rather than a frozen 2.7-only doc set.
