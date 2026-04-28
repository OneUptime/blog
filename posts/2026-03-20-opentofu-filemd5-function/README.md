# How to Use filemd5() in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, IaC, Function, Crypto

Description: Learn how to use the filemd5() function in OpenTofu to compute MD5 hashes of files for change detection.

Learn how to use the filemd5() function in OpenTofu to compute MD5 hashes of files for change detection.

## Syntax

```hcl
filemd5(path)
```

## Basic Example

```hcl
# Example usage in a configuration
locals {
  result = filemd5(var.input)
}

output "result" {
  value = local.result
}
```

## Practical Use Case

This function is part of OpenTofu's built-in function library and can be used
in any expression within your configuration.

## Related Functions

See the related function guides in this OpenTofu blog series for more examples.

## Conclusion

The `filemd5()` function is a useful tool in the OpenTofu expression language.
Refer to the [official OpenTofu documentation](https://opentofu.org/docs/language/functions/) for
the complete reference including all parameters and return values.
