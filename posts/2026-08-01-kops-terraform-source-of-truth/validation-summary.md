# Validation Summary: kOps with Terraform: Which State Is the Source of Truth and What Must Never Be Hand-Edited?

## Status
validated

## Post Type
Technical guide / operational reference

## Technologies Covered
- kOps
- Kubernetes
- Terraform CLI and HCL
- Terraform state and the S3 backend
- AWS S3 and IAM
- AWS EC2 Auto Scaling Groups and launch templates
- AWS networking resources, including VPCs, subnets, routes, and NAT gateways

## Sources Consulted
- kOps Terraform workflow: https://kops.sigs.k8s.io/terraform/
- kOps state store: https://kops.sigs.k8s.io/state/
- kOps `create cluster` CLI reference: https://kops.sigs.k8s.io/cli/kops_create_cluster/
- kOps `update cluster` CLI reference: https://kops.sigs.k8s.io/cli/kops_update_cluster/
- kOps `edit instancegroup` CLI reference: https://kops.sigs.k8s.io/cli/kops_edit_instancegroup/
- kOps working with InstanceGroups guide: https://kops.sigs.k8s.io/tutorial/working-with-instancegroups/
- kOps `rolling-update cluster` CLI reference: https://kops.sigs.k8s.io/cli/kops_rolling-update_cluster/
- kOps `delete cluster` CLI reference: https://kops.sigs.k8s.io/cli/kops_delete_cluster/
- kOps updates and upgrades for Terraform users: https://kops.sigs.k8s.io/operations/updates_and_upgrades/#terraform-users
- kOps Kubernetes upgrade sequencing: https://kops.sigs.k8s.io/tutorial/upgrading-kubernetes/
- kOps manifests and `kops replace`: https://kops.sigs.k8s.io/manifests_and_customizing_via_api/
- kOps existing VPC guidance: https://kops.sigs.k8s.io/run_in_existing_vpc/
- kOps AWS and Route 53 setup: https://kops.sigs.k8s.io/getting_started/aws/
- kOps DNS zone selection: https://kops.sigs.k8s.io/getting_started/arguments/#dns-zone
- Terraform state documentation: https://developer.hashicorp.com/terraform/language/state
- Terraform S3 backend and state-locking documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform 1.10 S3 backend documentation (native lock-file introduction): https://developer.hashicorp.com/terraform/language/v1.10.x/backend/s3
- Terraform plan modes: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform refresh-only workflow: https://developer.hashicorp.com/terraform/tutorials/state/refresh
- Terraform state commands: https://developer.hashicorp.com/terraform/cli/commands/state
- Terraform import documentation: https://developer.hashicorp.com/terraform/cli/import
- Terraform `lifecycle.ignore_changes` reference: https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle
- Terraform destroy command: https://developer.hashicorp.com/terraform/cli/commands/destroy

## Issues Found
- **The worker InstanceGroup example named a group that the initialization command does not create.** kOps names default worker groups `nodes-<zone>`, so `kops edit ig workers` would fail for the example cluster. Added `kops get ig` and changed the edit target to the generated `nodes-eu-west-2a` group.
- **The infrastructure prerequisites were implicit.** The kOps S3 state bucket and Terraform backend bucket must already exist, and the non-gossip cluster name requires a matching Route 53 hosted zone. Added the assumptions and documented kOps's longest-suffix DNS-zone selection behavior.
- **The S3 backend example recommended locking without enabling it.** The S3 backend's native lock file is opt-in and defaults to disabled. Added `use_lockfile = true`, its Terraform 1.10 minimum, and the required `s3:GetObject`, `s3:PutObject`, and `s3:DeleteObject` permissions on the `.tflock` object. This uses the current S3 locking mechanism; DynamoDB-based locking is deprecated.
- **The description of Terraform behavior after a direct kOps apply was inaccurate.** Terraform refreshes resources that are already bound in state, but it does not automatically import new objects created outside Terraform. Replaced the claim that a plan might “re-import” changes with the documented distinction between corrective changes to tracked objects and attempted creation of existing but unbound objects, which can fail on name conflicts.
- **Emergency cloud-edit reconciliation was stated too narrowly.** An emergency AWS edit does not always need to be adopted into desired state; it may instead be reverted. Updated the text to describe both valid reconciliation paths.
- **The targeted upgrade sequence was not version-scoped and omitted API-server InstanceGroups.** Current kOps documentation requires targeted Terraform application and scoped rolling updates when upgrading to Kubernetes 1.31 or newer, covering resources for both control-plane and API-server roles before the remaining apply and roll. The post now states that scope explicitly.
- **The teardown example claimed that both destruction plans were reviewed but skipped the kOps preview.** Added `kops delete cluster "$CLUSTER_NAME"` before the `--yes` invocation so operators can preview dynamically discovered resources before deletion.
- **“Deleting only kOps state” was ambiguous.** A normal `kops delete cluster --yes` also deletes associated resources; it is not merely a state deletion. Clarified that hand-removing only the kOps state objects is the operation that can strand Terraform-managed infrastructure and eliminate the desired-state inputs.
- **Several inline command references were abbreviated rather than executable.** Expanded `kops update` references to `kops update cluster`, added the cluster name to `kops reconcile cluster`, used the configured Terraform working directory for apply and drift plans, and expanded `state mv` / `state rm` to their full `terraform state` command forms.

## Review Notes
- The central source-of-truth model is correct: kOps state is the desired cluster definition, generated Terraform is a derived representation, and Terraform state binds Terraform resource addresses to remote objects.
- The `kops create cluster`, `kops edit cluster`, `kops edit ig`, `kops update cluster --target terraform --out`, `terraform -chdir`, rolling-update, refresh-only plan, destroy, and delete command forms were checked and are current.
- The warning against directly editing generated `kubernetes.tf`, raw Terraform state JSON, or kOps-owned AWS resources agrees with official guidance. Terraform explicitly recommends state CLI operations instead of editing state JSON directly.
- `terraform plan -refresh-only` is available in Terraform 0.15.4 and newer. It proposes state and root-output updates only; it does not propose remote-object changes.
- Native S3 lock files were introduced in Terraform 1.10. The post's backend example therefore intentionally requires Terraform 1.10 or newer even though other parts of the kOps-generated Terraform workflow support older Terraform releases.
- All external links already present in the post returned successful HTTP responses during validation.
