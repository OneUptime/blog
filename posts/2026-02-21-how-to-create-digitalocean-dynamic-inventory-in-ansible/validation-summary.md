# Validation Summary: How to Create DigitalOcean Dynamic Inventory in Ansible

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible dynamic inventory
- DigitalOcean Ansible collection
- DigitalOcean Droplets
- doctl CLI
- Terraform DigitalOcean provider
- DigitalOcean API authentication

## Sources Consulted
- DigitalOcean Ansible `digitalocean.cloud.droplets` inventory plugin documentation: https://docs.digitalocean.com/reference/ansible/reference/plugins/droplets/
- DigitalOcean doctl `compute droplet create` command reference: https://docs.digitalocean.com/reference/doctl/reference/compute/droplet/create/
- DigitalOcean Terraform `digitalocean_droplet` resource documentation: https://docs.digitalocean.com/reference/terraform/reference/resources/droplet/
- Ansible `ansible.builtin.apt` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible `ansible.builtin.stat` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/stat_module.html
- Ansible `ansible.builtin.reboot` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/reboot_module.html

## Issues Found
- The post used the deprecated `community.digitalocean.digitalocean` inventory plugin while installing `pydo`, which is used by DigitalOcean's maintained `digitalocean.cloud` collection. Updated the collection install command and all inventory snippets to use `digitalocean.cloud.droplets`.
- The static token option was shown as `api_token`, but the maintained plugin uses `token` and can also read `DO_API_TOKEN` and other supported environment variables. Updated the example.
- The examples used `var_prefix` and `do_*` host variables from the old community plugin. Updated attributes, filters, keyed groups, groups, and compose expressions to use the variable names exposed by `digitalocean.cloud.droplets`, with `tags` referenced as `do_tags` per the plugin documentation.
- The production configuration claimed to include only active droplets with the `ansible-managed` tag, but only filtered by active status. Added `api_filters.tag_name: ansible-managed` and kept the client-side active status filter.
- The production cache plugin value was shown as `jsonfile`; updated it to the fully qualified `ansible.builtin.jsonfile` form used in the official plugin example.
- The maintenance playbook referenced `reboot_required_file.stat.exists` without registering `reboot_required_file`. Added a `stat` task for `/var/run/reboot-required`.
- The doctl example used repeated `--tag-name` flags. Replaced them with `--tag-names web,production,ansible-managed`, which is the documented list form for applying multiple tags.

## Review Notes
Local `ansible-doc` was not available in this environment, so validation was performed against the current official DigitalOcean and Ansible documentation. The Terraform Droplet example was consistent with the current provider documentation, including `tags`, `vpc_uuid`, and `ssh_keys`.
