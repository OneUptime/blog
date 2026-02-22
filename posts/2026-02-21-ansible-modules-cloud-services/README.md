# How to Create Ansible Modules for Cloud Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Cloud, Module Development, AWS

Description: Create custom Ansible modules that manage cloud service resources using provider SDKs like boto3.

---

Cloud modules use provider SDKs to manage resources. Here is an example using boto3 for AWS.

## AWS Module with boto3

```python
#!/usr/bin/python
from ansible.module_utils.basic import AnsibleModule

try:
    import boto3
    from botocore.exceptions import ClientError
    HAS_BOTO3 = True
except ImportError:
    HAS_BOTO3 = False

def run_module():
    module = AnsibleModule(
        argument_spec=dict(
            name=dict(type='str', required=True),
            region=dict(type='str', default='us-east-1'),
            state=dict(type='str', default='present', choices=['present', 'absent']),
            tags=dict(type='dict', default={}),
        ),
        supports_check_mode=True,
    )

    if not HAS_BOTO3:
        module.fail_json(msg='boto3 required. Install with: pip install boto3')

    client = boto3.client('s3', region_name=module.params['region'])
    name = module.params['name']

    # Check if bucket exists
    try:
        client.head_bucket(Bucket=name)
        exists = True
    except ClientError:
        exists = False

    if module.params['state'] == 'present':
        if exists:
            module.exit_json(changed=False)
        if module.check_mode:
            module.exit_json(changed=True)
        try:
            client.create_bucket(
                Bucket=name,
                CreateBucketConfiguration={'LocationConstraint': module.params['region']}
            )
            if module.params['tags']:
                client.put_bucket_tagging(
                    Bucket=name,
                    Tagging={'TagSet': [{'Key': k, 'Value': v} for k, v in module.params['tags'].items()]}
                )
            module.exit_json(changed=True)
        except ClientError as e:
            module.fail_json(msg=str(e))

    elif module.params['state'] == 'absent':
        if not exists:
            module.exit_json(changed=False)
        if module.check_mode:
            module.exit_json(changed=True)
        try:
            client.delete_bucket(Bucket=name)
            module.exit_json(changed=True)
        except ClientError as e:
            module.fail_json(msg=str(e))

def main():
    run_module()

if __name__ == '__main__':
    main()
```

## Key Takeaways

Check for SDK availability at import time. Use the provider's error classes for specific error handling. Check resource existence for idempotency. Support tagging and region configuration.
