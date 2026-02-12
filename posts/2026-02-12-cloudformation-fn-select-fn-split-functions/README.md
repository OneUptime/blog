# How to Use CloudFormation Fn::Select and Fn::Split Functions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CloudFormation, Infrastructure as Code, DevOps

Description: Learn how to use CloudFormation Fn::Select and Fn::Split functions to manipulate lists and strings within your templates effectively.

---

CloudFormation gives you a handful of list manipulation functions, and `Fn::Select` and `Fn::Split` are two of the most useful. They let you pick items from lists and break strings apart - operations that come up constantly when you're working with subnets, availability zones, ARNs, and comma-delimited values.

## Fn::Select - Pick an Item from a List

`Fn::Select` returns a single item from a list by index. The index is zero-based.

```yaml
# Select the first item from a list (index 0)
Resources:
  MySubnet:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref MyVPC
      # GetAZs returns a list of AZs, Select picks one
      AvailabilityZone: !Select [0, !GetAZs '']
      CidrBlock: 10.0.1.0/24
```

The syntax is `!Select [index, list]`. That's it. The first argument is the index, the second is the list.

## Using Select with GetAZs

The most common `Fn::Select` pattern is picking availability zones:

```yaml
# Distribute subnets across availability zones
Resources:
  PublicSubnet1:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      CidrBlock: 10.0.1.0/24
      AvailabilityZone: !Select [0, !GetAZs '']

  PublicSubnet2:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      CidrBlock: 10.0.2.0/24
      AvailabilityZone: !Select [1, !GetAZs '']

  PublicSubnet3:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      CidrBlock: 10.0.3.0/24
      AvailabilityZone: !Select [2, !GetAZs '']
```

`!GetAZs ''` returns all availability zones in the current region as a list. Different regions have different numbers of AZs, so be careful with high indices - selecting index 5 in a region with only 3 AZs will fail.

## Select with Static Lists

You can use `Select` with literal lists too:

```yaml
# Pick a CIDR block based on a numeric parameter
Parameters:
  SubnetIndex:
    Type: Number
    Default: 0
    MinValue: 0
    MaxValue: 3

Resources:
  Subnet:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      CidrBlock: !Select
        - !Ref SubnetIndex
        - - 10.0.0.0/24
          - 10.0.1.0/24
          - 10.0.2.0/24
          - 10.0.3.0/24
```

## Fn::Split - Break a String into a List

`Fn::Split` takes a delimiter and a string, and returns a list of substrings:

```yaml
# Split a comma-separated string into a list
Parameters:
  SubnetIds:
    Type: String
    Description: Comma-separated subnet IDs
    Default: 'subnet-aaa,subnet-bbb,subnet-ccc'

Resources:
  LoadBalancer:
    Type: AWS::ElasticLoadBalancingV2::LoadBalancer
    Properties:
      # Split the string and use it as a list
      Subnets: !Split [',', !Ref SubnetIds]
```

The syntax is `!Split [delimiter, string]`. The delimiter is the character(s) to split on.

## Combining Split and Select

This is where things get powerful. You can split a string and then pick a specific piece:

```yaml
# Extract the account ID from a role ARN
# ARN format: arn:aws:iam::123456789012:role/MyRole
Parameters:
  RoleArn:
    Type: String
    Default: 'arn:aws:iam::123456789012:role/MyRole'

Outputs:
  AccountId:
    # Split the ARN by colon and pick index 4 (the account ID)
    Value: !Select [4, !Split [':', !Ref RoleArn]]
```

An ARN like `arn:aws:iam::123456789012:role/MyRole` splits on `:` into:
- Index 0: `arn`
- Index 1: `aws`
- Index 2: `iam`
- Index 3: `` (empty - global service)
- Index 4: `123456789012`
- Index 5: `role/MyRole`

## Practical Examples

### Parsing imported values

When another stack exports a comma-separated list, you need Split to use individual values:

```yaml
# Import a comma-separated list and pick individual items
Resources:
  Instance1:
    Type: AWS::EC2::Instance
    Properties:
      SubnetId: !Select
        - 0
        - !Split
          - ','
          - !ImportValue network-stack-PrivateSubnets
      InstanceType: t3.micro

  Instance2:
    Type: AWS::EC2::Instance
    Properties:
      SubnetId: !Select
        - 1
        - !Split
          - ','
          - !ImportValue network-stack-PrivateSubnets
      InstanceType: t3.micro
```

For more on cross-stack imports, see our post on [Fn::ImportValue for stack dependencies](https://oneuptime.com/blog/post/cloudformation-fn-importvalue-stack-dependencies/view).

### Extracting parts of resource identifiers

```yaml
# Extract the bucket name from an S3 ARN
Parameters:
  BucketArn:
    Type: String
    Default: 'arn:aws:s3:::my-example-bucket'

Outputs:
  BucketName:
    # Split on ":::" and take the second part
    Value: !Select [1, !Split [':::', !Ref BucketArn]]
    # Result: my-example-bucket
```

### Building CIDR blocks dynamically

```yaml
# Use Select with Fn::Cidr to generate subnet CIDRs
Resources:
  VPC:
    Type: AWS::EC2::VPC
    Properties:
      CidrBlock: 10.0.0.0/16

  Subnet0:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      # Cidr generates a list of CIDR blocks, Select picks one
      CidrBlock: !Select [0, !Cidr [!GetAtt VPC.CidrBlock, 6, 8]]

  Subnet1:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      CidrBlock: !Select [1, !Cidr [!GetAtt VPC.CidrBlock, 6, 8]]

  Subnet2:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      CidrBlock: !Select [2, !Cidr [!GetAtt VPC.CidrBlock, 6, 8]]
```

`Fn::Cidr` generates a list of CIDR blocks from a parent CIDR. Here it creates 6 `/24` subnets from the `/16` VPC CIDR. `Select` then picks individual subnets.

### Conditional selection from a list

Combine `Select` with `Fn::If` to pick different items based on conditions:

```yaml
# Select different values based on a condition
Conditions:
  IsProduction: !Equals [!Ref Environment, prod]

Resources:
  Instance:
    Type: AWS::EC2::Instance
    Properties:
      InstanceType: !Select
        - !If [IsProduction, 2, 0]
        - - t3.micro
          - t3.small
          - t3.large
```

When the condition is true (production), it selects index 2 (`t3.large`). Otherwise, index 0 (`t3.micro`). Though for this particular case, a simple `!If [IsProduction, t3.large, t3.micro]` would be cleaner. The Select pattern shines when you have more than two options.

## Working with CommaDelimitedList Parameters

When a parameter is `CommaDelimitedList`, it's already a list - no split needed:

```yaml
# CommaDelimitedList is already a list - use Select directly
Parameters:
  SubnetIds:
    Type: CommaDelimitedList
    Description: Comma-separated subnet IDs

Resources:
  Instance:
    Type: AWS::EC2::Instance
    Properties:
      # No Split needed - SubnetIds is already a list
      SubnetId: !Select [0, !Ref SubnetIds]
```

But when you import a value from another stack or receive it as a plain `String`, you'll need `Split` first.

## Edge Cases and Gotchas

**Index out of bounds.** If you select an index that doesn't exist, the stack creation fails. There's no graceful fallback. Always ensure the list is long enough.

```yaml
# This will FAIL if the region has fewer than 4 AZs
BadExample:
  AvailabilityZone: !Select [3, !GetAZs '']
```

**Empty strings after split.** Splitting `"a::b"` on `":"` produces `["a", "", "b"]`. That empty string at index 1 can cause unexpected behavior.

**Split doesn't trim whitespace.** Splitting `"a, b, c"` on `","` gives `["a", " b", " c"]` - note the leading spaces. Either ensure your input has no spaces or handle them in your logic.

**Select only works with lists.** You can't use `Select` on a string - split it first if you need to index into a string.

## Best Practices

**Prefer CommaDelimitedList parameters over String + Split.** If you know a parameter will contain multiple values, declare it as `CommaDelimitedList` from the start.

**Use GetAZs carefully.** Different regions have different numbers of AZs. If your template needs to be region-agnostic, don't hardcode assumptions about the number of available zones.

**Comment your Split/Select chains.** Complex `!Select [2, !Split [':', !Ref SomeArn]]` expressions aren't self-documenting. Add a comment explaining what you're extracting.

**Consider Fn::Sub for simple string assembly.** If you're splitting and selecting just to reassemble a string differently, `Fn::Sub` might be simpler. See our guide on [Ref, Fn::Sub, and Fn::Join](https://oneuptime.com/blog/post/cloudformation-intrinsic-functions-ref-sub-join/view).

These functions are small but essential. They let you work with the lists and strings that CloudFormation naturally produces, turning raw resource outputs into usable values throughout your templates.
