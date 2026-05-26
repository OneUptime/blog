# Validation Summary: How to Use Ansible to Create AWS Application Load Balancers

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- amazon.aws Ansible collection
- community.aws Ansible collection
- AWS Elastic Load Balancing v2
- Application Load Balancers
- ALB target groups, listeners, listener rules, health checks, HTTPS, and sticky sessions

## Sources Consulted
- Ansible `amazon.aws.elb_application_lb` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/elb_application_lb_module.html
- Ansible `community.aws.elb_target_group` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/aws/elb_target_group_module.html
- Ansible `amazon.aws` collection documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/index.html
- Ansible `community.aws` collection documentation: https://docs.ansible.com/ansible/latest/collections/community/aws/index.html
- AWS Application Load Balancer listener documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-listeners.html
- AWS Application Load Balancer listener rules documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/listener-rules.html
- AWS Application Load Balancer rule condition documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/rule-condition-types.html
- AWS Application Load Balancer target group documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-target-groups.html
- AWS Application Load Balancer target group health check documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/target-group-health-checks.html
- AWS Elastic Load Balancing scheme documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/userguide/how-elastic-load-balancing-works.html#load-balancer-scheme

## Issues Found
- The prerequisites listed only the `amazon.aws` collection, but the playbooks use `community.aws.elb_target_group`. Added `community.aws` to the prerequisites and installation commands.
- The prerequisites said Ansible 2.14+, but the current official `community.aws` collection documentation requires ansible-core 2.17 or newer, and `amazon.aws` requires ansible-core 2.16 or newer. Updated the prerequisite to Ansible 2.17+.
- The dependency command installed unversioned boto3 and botocore, but the current `amazon.aws.elb_application_lb` module requires boto3 and botocore 1.34.0 or newer. Updated the pip command accordingly.
- The post said ALB creation requires a separate listener module, but the `amazon.aws.elb_application_lb` module accepts listeners and listener rules directly. Reworded that sentence to match the documented module behavior.
- The internal ALB explanation said `scheme: internal` places the ALB in private subnets and gives it a DNS name only resolvable within the VPC. AWS documents that an internal load balancer's DNS name is publicly resolvable to private IP addresses, and subnet placement is controlled by the selected subnets. Reworded the explanation.

## Review Notes
The remaining examples use documented module parameters and AWS listener rule condition/action structures. The examples still use placeholder IDs, ARNs, subnets, and security groups, so they must be replaced with real resources before execution.
