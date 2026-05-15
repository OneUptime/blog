# Validation Summary: How to Set Up RHEL Auto-Scaling Groups on AWS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- AWS EC2 launch templates
- Amazon EC2 Auto Scaling groups
- AWS CLI
- Application Load Balancer target groups
- CloudWatch-backed target tracking scaling policies
- cloud-init
- firewalld
- nginx

## Sources Consulted
- AWS CLI Command Reference: `ec2 create-launch-template` - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-launch-template.html
- AWS CLI Command Reference: `autoscaling create-auto-scaling-group` - https://docs.aws.amazon.com/cli/latest/reference/autoscaling/create-auto-scaling-group.html
- AWS CLI Command Reference: `autoscaling put-scaling-policy` - https://docs.aws.amazon.com/cli/latest/reference/autoscaling/put-scaling-policy.html
- AWS CLI Command Reference: `autoscaling describe-auto-scaling-groups` - https://docs.aws.amazon.com/cli/latest/reference/autoscaling/describe-auto-scaling-groups.html
- AWS CLI Command Reference: `autoscaling describe-scaling-activities` - https://docs.aws.amazon.com/cli/latest/reference/autoscaling/describe-scaling-activities.html
- cloud-init documentation: Run commands during boot - https://docs.cloud-init.io/en/latest/reference/yaml_examples/boot_cmds.html
- cloud-init module reference: `runcmd` - https://cloudinit.readthedocs.io/en/stable/reference/modules.html
- Red Hat Enterprise Linux 9 documentation: Configuring firewalls and packet filters - https://docs.redhat.com/en-us/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/

## Issues Found
- The `ALBRequestCountPerTarget` target tracking policy used an incomplete `ResourceLabel` value (`app/my-alb/...`). AWS requires the final portion of the load balancer ARN and the final portion of the target group ARN joined with `/`, such as `app/my-alb/778d41231b141a0f/targetgroup/my-alb-target-group/943f017f100becff`. Updated the example to use the documented shape.
- The cloud-init user data snippet omitted the `#cloud-config` header. Added it so cloud-init treats the `runcmd` YAML as cloud-config data.

## Review Notes
- The AMI ID, subnet IDs, security group ID, key pair name, and target group ARN are placeholders and must be replaced with real regional AWS resources before use.
- The `base64 -w0` command is GNU coreutils syntax and works on Linux. On macOS, users would need an equivalent command such as `base64 -i cloud-init.yaml | tr -d '\n'`.
