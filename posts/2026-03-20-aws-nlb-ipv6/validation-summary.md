# Validation Summary: How to Configure AWS NLB with IPv6

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- AWS Elastic Load Balancing v2 / Network Load Balancer
- AWS CLI
- Terraform AWS Provider
- IPv6 / dualstack networking
- AWS security groups
- TCP, TLS, and UDP load balancing

## Sources Consulted
- AWS Network Load Balancers overview: https://docs.aws.amazon.com/elasticloadbalancing/latest/network/network-load-balancers.html
- Create a Network Load Balancer: https://docs.aws.amazon.com/elasticloadbalancing/latest/network/create-network-load-balancer.html
- Listeners for your Network Load Balancers: https://docs.aws.amazon.com/elasticloadbalancing/latest/network/load-balancer-listeners.html
- Target groups for your Network Load Balancers: https://docs.aws.amazon.com/elasticloadbalancing/latest/network/load-balancer-target-groups.html
- Edit target group attributes for your Network Load Balancer: https://docs.aws.amazon.com/elasticloadbalancing/latest/network/edit-target-group-attributes.html
- Register targets for your Network Load Balancer: https://docs.aws.amazon.com/elasticloadbalancing/latest/network/target-group-register-targets.html
- Update the security groups for your Network Load Balancer: https://docs.aws.amazon.com/elasticloadbalancing/latest/network/load-balancer-security-groups.html
- AWS CLI `create-load-balancer`: https://docs.aws.amazon.com/cli/latest/reference/elbv2/create-load-balancer.html
- AWS CLI `set-ip-address-type`: https://docs.aws.amazon.com/cli/latest/reference/elbv2/set-ip-address-type.html
- Terraform AWS provider `aws_lb`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/lb.html.markdown
- Terraform AWS provider `aws_lb_listener`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/lb_listener.html.markdown
- Terraform AWS provider `aws_lb_target_group`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/lb_target_group.html.markdown

## Issues Found
- The post stated that NLBs do not use security groups. I updated the Terraform and explanation sections to reflect current AWS behavior: NLBs can use security groups when they are associated at creation time, and target security groups can reference the NLB security group.
- The Terraform example referenced `aws_lb_target_group.tcp_80` without defining it. I added the missing target group so the listener example is internally consistent.
- The Terraform example used `preserve_client_ip = "true"` as a string. I changed it to a boolean to match Terraform provider expectations.
- The source IP preservation section incorrectly implied that backends always see the real client IPv6 address and therefore should allow `::/0`. I corrected it to match AWS's documented dualstack translation behavior and updated the target security group example.
- The UDP IPv6 section used an IPv4/instance target group. I changed it to an IPv6 IP target group because dualstack UDP listeners require IPv6 target groups.
- The CLI example used an invalid shortened ARN placeholder and a DNS lookup command that depended on `NLB_ARN` even in the new-load-balancer path. I replaced the ARN with a valid placeholder format and changed the lookup example to query by name.
- The source IP section contained HCL inside a `bash` code fence. I corrected the fence to `hcl`.

## Review Notes
- AWS's NLB user guide documents dualstack UDP listeners with IPv6 target groups. The current Terraform AWS provider documentation still contains an older note saying UDP or TCP_UDP listeners are not valid with dualstack listeners, so I aligned the post with the current AWS NLB service documentation and noted the discrepancy here.
