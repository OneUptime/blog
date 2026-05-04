# Validation Summary: How to Configure IBM Cloud VPC with IPv6

## Status
not-technically-relevant

## Post Type
Tutorial / Guide (technical implementation walkthrough using CLI and Terraform)

## Technologies Covered
- IBM Cloud VPC
- IBM Cloud CLI (`ibmcloud is`) with the `vpc-infrastructure` plugin
- Terraform with the `IBM-Cloud/ibm` provider (`ibm_is_vpc`, `ibm_is_subnet`, `ibm_is_instance`, `ibm_is_security_group`, `ibm_is_security_group_rule`, `ibm_is_floating_ip`)
- IPv6 networking concepts (CIDR blocks, ICMPv6, dual-stack)

## Sources Consulted
- IBM Cloud VPC limitations documentation: https://github.com/ibm-cloud-docs/vpc/blob/master/limitations.md (explicitly lists "IPV6" under "Concepts that are not supported")
- IBM Cloud Terraform provider `ibm_is_subnet` resource docs: https://github.com/IBM-Cloud/terraform-provider-ibm/blob/master/website/docs/r/is_subnet.html.markdown
- IBM Cloud Terraform provider `ibm_is_floating_ip` resource docs: https://github.com/IBM-Cloud/terraform-provider-ibm/blob/master/website/docs/r/is_floating_ip.html.markdown
- IBM Cloud feature request "IPv6 support in IBM Cloud VPC" (IDEA-I-3855): https://ibmcloud.ideas.ibm.com/ideas/IDEA-I-3855 — still an open idea, indicating IPv6 is not yet generally available
- Red Hat OpenShift on IBM Cloud install docs (which explicitly state IBM Cloud VPC does not support IPv6 / dual-stack)

## Issues Found
The entire premise of this post is technically incorrect. IBM Cloud VPC does not support IPv6 addressing, which means none of the configuration steps shown in this post will work as written. Specific defects:

1. **"IBM Cloud VPC supports IPv6 addressing" / "dual-stack support" claim (Introduction & Conclusion)** — False. IBM Cloud VPC's official limitations documentation lists IPv6 explicitly as "not supported." This is also confirmed by the still-open IBM Cloud customer idea IDEA-I-3855 ("IPv6 support in IBM Cloud VPC") and by Red Hat's OpenShift-on-IBM-Cloud install guides which state dual-stack/IPv6 environments are not possible on IBM Cloud VPC.

2. **`ibmcloud is subnet-create --ipv6-cidr-block "2607:f0d0:10::/48"`** — Invalid. This flag does not exist on the `ibmcloud is subnet-create` command. The IBM Cloud CLI for VPC supports only IPv4 CIDR blocks (`--ipv4-cidr-block` / `--total-ipv4-address-count`).

3. **`ibm_is_subnet` Terraform resource implications** — The `ibm_is_subnet` resource exposes `ipv6_cidr_block` only as a computed/read-only attribute (reserved for future use), not as a configurable input. There is no way to provision an IPv6 subnet via Terraform on IBM Cloud today.

4. **`ibm_is_security_group_rule` with `remote = "::/0"`** — While the field nominally accepts a remote CIDR, IBM Cloud VPC security groups operate on IPv4-only traffic; an IPv6 remote has no effect because IPv6 traffic does not flow on the VPC fabric.

5. **"Floating IP (Public IPv6)" section** — Invalid. IBM Cloud floating IPs are IPv4-only. The provider documentation explicitly notes that IPv6 support in floating IPs is a *future* possibility, not a current feature. `ibm_is_floating_ip` cannot return an IPv6 address.

6. **Testing Connectivity section** — The `ssh root@$(terraform output -raw public_ipv6)` command and the `curl -6 https://[<floating-ipv6>]/` command cannot succeed because no public IPv6 address would ever be assigned by IBM Cloud VPC.

Because every concrete code block, command, and configuration in the post depends on a feature that IBM Cloud VPC does not provide, there is no surface-level fix that would make this post correct. The post cannot be salvaged through line-level edits — it would need to be entirely rewritten as something different (e.g. "Why IBM Cloud VPC does not yet support IPv6, and what the alternatives are"). Marking as `not-technically-relevant`.

## Review Notes
- If/when IBM Cloud adds IPv6 support to VPC (idea IDEA-I-3855), a future post on this topic would be appropriate, but the API surface (CLI flags, Terraform argument names, floating IP behaviour) at that point is unknown and should be verified against IBM's then-current docs rather than guessed.
- The `IBM-Cloud/ibm` Terraform provider source/version block in the post omits a pinned version, which is a minor best-practice issue but not the reason for the not-technically-relevant verdict.
- The image reference `ibm-ubuntu-22-04-3-minimal-amd64-3` is plausible for IBM Cloud's stock image catalogue and the instance profile `cx2-2x4` is a real profile, so those individual elements are fine — but they are embedded in code that cannot work.
