# kOps with Terraform: Which State Is the Source of Truth and What Must Never Be Hand-Edited?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: kOps, Kubernetes, Terraform, Infrastructure as Code, State Management, AWS

Description: Keep kOps desired cluster state, generated Terraform configuration, and Terraform resource state in distinct roles with one safe change workflow.

---

In a kOps Terraform workflow, there are three artifacts with different responsibilities:

1. **kOps state store:** the desired Cluster and InstanceGroup configuration; kOps documentation calls this the ultimate source of truth for the Kubernetes cluster.
2. **Generated Terraform files:** a derived cloud-resource representation produced by kOps.
3. **Terraform state:** Terraform's mapping between resource addresses, attributes, and the real cloud objects it manages.

Confusing these roles creates two competing control planes. Edit desired Kubernetes infrastructure through kOps, regenerate Terraform, and let Terraform apply it. Do not repair drift by hand-editing generated files, S3 state objects, Terraform state JSON, or AWS resources.

## The State Flow

```text
kOps Cluster + InstanceGroups in state store
                    |
                    | kops update cluster ... --target terraform
                    v
          generated .tf configuration
                    |
                    | terraform plan / apply
                    v
              AWS resources
                    ^
                    |
              Terraform state
```

Terraform state records what Terraform manages and the last known attributes. It does not replace the kOps Cluster spec as the authoring interface for Kubernetes version, node configuration, networking intent, or managed addons.

## Initialize a Terraform-Target Cluster

Assume both S3 buckets already exist with versioning enabled and Route 53 has a hosted zone that is a suffix of `prod.example.com`. Without `--dns-zone`, kOps selects the longest matching hosted zone. Then create the kOps desired state and render Terraform to a stable directory:

```bash
export KOPS_STATE_STORE=s3://company-kops-state
export CLUSTER_NAME=prod.example.com

mkdir -p ./cluster-infrastructure

kops create cluster \
  --name "$CLUSTER_NAME" \
  --cloud aws \
  --zones eu-west-2a,eu-west-2b,eu-west-2c \
  --target terraform \
  --out ./cluster-infrastructure
```

Add the Terraform backend configuration as a separate, operator-owned `.tf` file in that directory:

```hcl
terraform {
  backend "s3" {
    bucket       = "company-terraform-state"
    key          = "kops/prod/terraform.tfstate"
    region       = "eu-west-2"
    use_lockfile = true
  }
}
```

The Terraform backend and `KOPS_STATE_STORE` can both use S3, but they store different data and should use distinct keys, permissions, versioning, and locking/coordination controls. Native S3 lock files require Terraform 1.10 or newer. With `use_lockfile = true`, the backend role also needs `s3:GetObject`, `s3:PutObject`, and `s3:DeleteObject` on the `.tflock` object.

Then:

```bash
terraform -chdir=./cluster-infrastructure init
terraform -chdir=./cluster-infrastructure plan
terraform -chdir=./cluster-infrastructure apply
```

Check generated Terraform into version control if that fits the organization's workflow. It provides a reviewable representation, but regeneration—not manual patching—should create changes to kOps-owned blocks.

## Make Changes at the kOps Layer

For a Cluster change:

```bash
kops edit cluster "$CLUSTER_NAME"
```

For a worker change:

```bash
kops get ig --name "$CLUSTER_NAME"
kops edit ig --name "$CLUSTER_NAME" nodes-eu-west-2a
```

By default, kOps names a worker InstanceGroup `nodes-<zone>`; choose the group you intend to change from the `kops get ig` output.

Regenerate into the **same** directory:

```bash
kops update cluster "$CLUSTER_NAME" \
  --target terraform \
  --out ./cluster-infrastructure
```

Review both representations:

```bash
git diff -- ./cluster-infrastructure
terraform -chdir=./cluster-infrastructure plan
```

The generated-file diff answers “what configuration did kOps render differently?” The Terraform plan answers “what does Terraform intend to change in the cloud?” Review both before apply.

```bash
terraform -chdir=./cluster-infrastructure apply
```

Some launch-template changes do not replace running nodes. Preview and run a kOps rolling update afterward when needed:

```bash
kops rolling-update cluster "$CLUSTER_NAME"
kops rolling-update cluster "$CLUSTER_NAME" --yes
```

Terraform applies cloud configuration; kOps rolling-update performs Kubernetes-aware node rotation. Neither step substitutes for the other.

## Never Run Direct and Terraform Applies Against the Same Resources

For a Terraform-target cluster, do not alternate between:

```bash
kops update cluster "$CLUSTER_NAME" --yes
```

and:

```bash
terraform -chdir=./cluster-infrastructure apply
```

The first is the direct target and can mutate AWS outside Terraform. The next Terraform plan refreshes objects already in state, but it does not automatically import newly created objects that are absent from state; depending on the change, it may propose corrective changes to tracked objects or try to create an existing but unbound object and fail on a name conflict. Always use `--target terraform --out ...` for cloud-resource generation in this workflow.

Similarly, do not attach separate Terraform resources, console changes, and kOps ownership to the same ASG, launch template, security group, or load balancer.

## What Must Not Be Hand-Edited

### Raw kOps objects in the state-store bucket

Do not edit S3 objects under the kOps state path. Use `kops edit`, `kops replace -f`, or documented kOps commands so validation, defaulting, and object layout remain correct.

### kOps-generated Terraform blocks

Do not make a permanent fix inside generated `kubernetes.tf`. The next `kops update cluster "$CLUSTER_NAME" --target terraform --out ...` can overwrite it, and the kOps state will still express the old intent.

kOps documentation permits additional `.tf` files for customization. Keep clearly external resources there, with unambiguous ownership, rather than modifying generated blocks.

### Terraform state JSON

Do not download and text-edit `terraform.tfstate`. Use documented `terraform import`, `terraform state mv`, `terraform state rm`, or provider migration procedures only for an intentional state operation, with backup and peer review. State commands change Terraform's ownership map; they do not change kOps desired state.

### kOps-owned AWS resources

Do not resize ASGs, change launch templates, edit security groups, or replace load balancers in the AWS console as a normal workflow. An emergency edit must either be reverted or reconciled back into kOps state and regenerated Terraform immediately, or the next plan can undo it.

## Keep Custom Terraform at a Clean Boundary

Reasonable operator-owned files can include:

- the Terraform backend;
- provider configuration required by the organization;
- monitoring or governance resources outside kOps ownership;
- inputs and outputs that connect an externally owned network stack;
- policy attachments not generated by kOps, if they do not conflict.

Avoid using a second Terraform resource to mutate attributes of a resource already generated by kOps. If kOps supports the setting, put it in the Cluster or InstanceGroup API. If it does not, verify that the customization has an independent lifecycle and cannot be overwritten.

For an existing shared VPC, keep VPCs, subnets, routes, and NAT gateways in the network stack. Pass their IDs through the kOps Cluster spec. Do not import the same shared resource into each cluster's Terraform state as though every cluster owns it.

## Diagnose Drift by Layer

Use a consistent sequence:

1. Export the kOps Cluster and InstanceGroups and confirm intended values.
2. Regenerate Terraform into a clean worktree or compare with committed output.
3. Run `terraform -chdir=./cluster-infrastructure plan -refresh-only` to inspect external drift without proposing changes to remote objects, when appropriate for the installed Terraform version.
4. Run the normal `terraform -chdir=./cluster-infrastructure plan`.
5. Decide whether drift should be reverted in AWS or adopted into kOps desired state.

Examples:

- **Generated `.tf` changes unexpectedly:** kOps binary version, defaults, channel, or desired state changed.
- **Generated `.tf` is stable but plan changes:** AWS drift, provider behavior, or Terraform state differs.
- **Terraform is converged but nodes have old settings:** a kOps rolling update is still required.
- **kOps state says one thing and hand-edited `.tf` another:** remove the manual fork and express the supported intent at the kOps layer.

Do not use `lifecycle.ignore_changes` broadly to hide unexplained drift. It can suppress legitimate kOps updates and leave the cluster dependent on invisible console state.

## Upgrades Require Extra Coordination

A Kubernetes version upgrade changes control-plane and node launch configuration. Follow the kOps upgrade documentation for the target releases, regenerate Terraform, and apply components in the required order.

For upgrades to Kubernetes 1.31 or newer, current kOps documentation requires Terraform users to target the resources backing control-plane and API-server InstanceGroups, perform a scoped rolling update, and then apply and roll the rest. Do not replace that sequence with direct `kops reconcile cluster "$CLUSTER_NAME" --yes`; it would bypass Terraform ownership.

Use the exact procedure for the installed kOps and Kubernetes versions. Upgrade workflows change across kOps releases.

## Teardown Still Has Two States

kOps documentation recommends destroying Terraform-managed infrastructure and then deleting the kOps cluster specification and dynamically created resources:

```bash
terraform -chdir=./cluster-infrastructure plan -destroy
terraform -chdir=./cluster-infrastructure destroy

kops delete cluster "$CLUSTER_NAME"
kops delete cluster "$CLUSTER_NAME" --yes
```

Review both destruction plans. Workload-created load balancers and persistent volumes may have lifecycles outside generated Terraform, while shared VPC resources must remain protected.

Deleting only Terraform state does not delete kOps desired state. Hand-removing only the kOps state objects can strand Terraform-managed infrastructure and remove the inputs needed to regenerate it.

## Source-of-Truth Checklist

- Are Cluster and InstanceGroup changes made through kOps?
- Is one stable output directory used for regeneration?
- Are generated diffs and Terraform plans both reviewed?
- Is direct `kops update cluster --yes` prohibited for Terraform-owned cloud resources?
- Are custom `.tf` resources outside kOps ownership?
- Is Terraform state changed only through documented state commands?
- Are emergency AWS edits immediately reverted or represented in kOps state?
- Are shared VPC resources owned by exactly one network stack?
- Are rolling updates run after launch-template changes when required?
- Does teardown account for Terraform state, kOps state, and dynamic Kubernetes resources?

kOps state describes the cluster you want. Generated Terraform translates that intent. Terraform state tracks the cloud objects created from it. Keeping those roles distinct makes plans reproducible and recovery understandable.

## Official Documentation

- [kOps: Building clusters with Terraform](https://kops.sigs.k8s.io/terraform/)
- [kOps: Updates and upgrades for Terraform users](https://kops.sigs.k8s.io/operations/updates_and_upgrades/#terraform-users)
- [kOps: Upgrading Kubernetes and Terraform sequencing](https://kops.sigs.k8s.io/tutorial/upgrading-kubernetes/)
- [kOps: State store](https://kops.sigs.k8s.io/state/)
- [kOps: Using manifests and `kops replace`](https://kops.sigs.k8s.io/manifests_and_customizing_via_api/)
- [Terraform: State](https://developer.hashicorp.com/terraform/language/state)
- [Terraform: Backends](https://developer.hashicorp.com/terraform/language/backend)
- [Terraform CLI: State commands](https://developer.hashicorp.com/terraform/cli/commands/state)
