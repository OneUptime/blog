# Validation Summary: How to Use Ansible meta refresh_inventory

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- ansible.builtin.meta refresh_inventory
- Dynamic inventory
- ansible.builtin.add_host
- Amazon AWS Ansible collection
- Community Docker Ansible collection
- Terraform CLI invocation from Ansible

## Sources Consulted
- Ansible ansible.builtin.meta module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/meta_module.html
- Ansible ansible.builtin.add_host module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/add_host_module.html
- Amazon AWS amazon.aws.ec2_instance module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_instance_module.html
- Amazon AWS amazon.aws.ec2_instance_info module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_instance_info_module.html
- Amazon AWS amazon.aws.autoscaling_group module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/autoscaling_group_module.html
- Amazon AWS amazon.aws.aws_ec2 inventory plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/aws_ec2_inventory.html
- Community Docker community.docker.docker_container module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_container_module.html
- Community Docker community.docker.docker_containers inventory plugin documentation: https://docs.ansible.com/ansible/latest/collections/community/docker/docker_containers_inventory.html
- Community Docker community.docker.docker connection plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_connection.html

## Issues Found
- The first YAML example used an unquoted play name containing a colon. Quoted the play name so the snippet is valid YAML.
- The post described `refresh_inventory` as re-reading inventory without noting inventory cache behavior. Updated the explanation and limitations to clarify that inventory script or plugin caches may still need to be disabled or refreshed separately.
- The Docker container example used `connection: docker`. Updated it to `connection: community.docker.docker`, which is the documented current connection plugin name in the Community Docker collection.
- The performance guidance said to place refreshes between plays. Updated it to the more precise limitation from the Ansible documentation: refreshed hosts are not added to the current play's host loop, so subsequent plays or explicit delegation are needed.
- Replaced the unsupported claim that `set_fact` variables are lost for hosts removed from inventory with documented `refresh_inventory` limitations around the current play host loop and inventory caching.

## Review Notes
The AWS examples assume a correctly configured dynamic inventory source, such as `amazon.aws.aws_ec2` with keyed groups that create tag-based groups like `tag_Role_webserver`. The Docker example similarly assumes a configured Docker dynamic inventory source that produces the `docker_containers` group.
