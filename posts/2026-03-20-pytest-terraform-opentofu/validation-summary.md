# Validation Summary: How to Use pytest-terraform with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- `pytest-terraform`
- OpenTofu
- `pytest`
- Python
- `boto3`
- AWS EC2 security groups and instance types

## Sources Consulted
- `pytest-terraform` PyPI project documentation: https://pypi.org/project/pytest-terraform/
- `pytest-terraform` 0.7.0 package source inspected locally from the PyPI wheel (`pytest_terraform/plugin.py`, `pytest_terraform/tf.py`)
- OpenTofu input variables docs: https://opentofu.org/docs/language/values/variables/
- OpenTofu environment variables docs: https://opentofu.org/docs/cli/config/environment-variables/
- OpenTofu output values docs: https://opentofu.org/docs/language/values/outputs/
- Pytest fixtures docs: https://docs.pytest.org/en/stable/how-to/fixtures.html
- Pytest monkeypatch docs: https://docs.pytest.org/en/stable/how-to/monkeypatch.html
- Boto3 `describe_security_groups` reference: https://docs.aws.amazon.com/boto3/latest/reference/services/ec2/client/describe_security_groups.html
- Boto3 `describe_instance_types` reference: https://docs.aws.amazon.com/boto3/latest/reference/services/ec2/client/describe_instance_types.html

## Issues Found
- The post used unsupported `pytest-terraform` config names (`terraform_binary`, `terraform_dir`) and a custom `pytest_configure` hook that did not actually switch the plugin to OpenTofu. I replaced that with the plugin's supported `terraform-mod-dir` setting and documented the plugin's built-in `tofu` auto-detection behavior.
- The module test examples accessed outputs as `fixture["output_name"]`. In `pytest-terraform`, module outputs are exposed via the fixture's `.outputs` mapping, so I changed those examples to `fixture.outputs["name"]["value"]`.
- The AWS validation example had the same output-access problem for the security group ID. I updated it to read from `.outputs` and to derive the AWS region from environment variables so it matches the execution examples later in the post.
- The “Fixture for Terraform Variables” section returned Python dictionaries, but `pytest-terraform` does not automatically convert arbitrary pytest fixture return values into OpenTofu input variables. I replaced that section with a working pattern that sets `TF_VAR_*` environment variables from pytest fixtures, which OpenTofu officially supports.
- The parametrized EC2 example was described as testing CPU credits, but the code only checked `VCpuInfo.DefaultVCpus`. I renamed the test and docstring so the example matches what the code actually validates.
- The command `pytest tests/ --terraform-no-cleanup` is not a valid `pytest-terraform` CLI option. I replaced it with accurate guidance to use `teardown=terraform.TEARDOWN_OFF` on the decorator when you want to keep infrastructure for debugging.

## Review Notes
- `pytest-terraform` 0.7.0 clearly documents `function` and `session` scopes; `module` scope is supported in code and should work, but the project documentation notes that scopes beyond those primary examples have not been as thoroughly tested.
- The post assumes OpenTofu is already installed and available as `tofu` on `PATH`; that binary must be present for the non-replay examples to run.
- No additional technical issues found after the corrections.
