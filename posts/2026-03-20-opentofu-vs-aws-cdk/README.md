# OpenTofu vs AWS CDK: Choosing the Right IaC Tool

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS CDK, Comparison, Infrastructure as Code, AWS, DevOps

Description: Compare OpenTofu and AWS CDK - their programming models, testing approaches, and multi-cloud capabilities - to choose the right infrastructure as code tool for AWS workloads.

## Introduction

OpenTofu and AWS CDK are both used to provision AWS infrastructure, but through different approaches. OpenTofu uses declarative HCL. AWS CDK uses TypeScript, JavaScript, Python, Java, C#, or Go to synthesize CloudFormation templates. CDK is developer-friendly but AWS-only; OpenTofu is multi-cloud but requires learning HCL.

## How They Work

OpenTofu (HCL → direct provider API):

```hcl
resource "aws_lambda_function" "api" {
  function_name = "api-handler"
  role          = aws_iam_role.lambda.arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  filename      = data.archive_file.lambda.output_path

  environment {
    variables = {
      ENV = var.environment
    }
  }
}
```

AWS CDK (TypeScript → CloudFormation):

```typescript
import * as lambda from 'aws-cdk-lib/aws-lambda';

const apiHandler = new lambda.Function(this, 'ApiHandler', {
  functionName: 'api-handler',
  code: lambda.Code.fromAsset('./src'),
  handler: 'index.handler',
  runtime: lambda.Runtime.NODEJS_20_X,
  environment: {
    ENV: environment,
  },
});
```

## Comparison Matrix

| Feature | OpenTofu | AWS CDK |
|---------|----------|---------|
| Language | HCL | TypeScript, JavaScript, Python, Java, C#, Go |
| Multi-cloud | Yes | No (AWS only via CloudFormation) |
| Output | Direct API calls | CloudFormation templates |
| State management | .tfstate files | CloudFormation stacks |
| Constructs/Modules | HCL modules | L2/L3 construct libraries |
| Testing | Terratest | CDK assertions (`aws-cdk-lib/assertions`) |
| IDE support | HCL plugins | Native TypeScript/Python |
| Abstractions | Limited | High-level constructs (L2, L3) |
| Rollback | Manual | CloudFormation automatic |
| License | MPL 2.0 | Apache 2.0 |

## CDK Constructs vs OpenTofu Modules

CDK's strongest feature is high-level constructs - opinionated, pre-configured resources:

```typescript
// CDK L3 Construct: ApplicationLoadBalancedFargateService
// This one construct creates: ECS cluster, task definition, service,
// load balancer, target groups, security groups, IAM roles
import * as ecs_patterns from 'aws-cdk-lib/aws-ecs-patterns';

new ecs_patterns.ApplicationLoadBalancedFargateService(this, 'Service', {
  cluster,
  taskImageOptions: {
    image: ecs.ContainerImage.fromRegistry('nginx'),
  },
  desiredCount: 2,
  publicLoadBalancer: true,
});
```

Equivalent OpenTofu with a community module:

```hcl
module "ecs_service" {
  source  = "terraform-aws-modules/ecs/aws//modules/service"
  version = "~> 5.0"

  name        = "my-service"
  cluster_arn = module.ecs_cluster.arn

  cpu    = 256
  memory = 512

  container_definitions = jsonencode([{
    name  = "nginx"
    image = "nginx"
    portMappings = [{ containerPort = 80 }]
  }])

  load_balancer = {
    service = {
      target_group_arn = module.alb.target_groups["nginx"].arn
      container_name   = "nginx"
      container_port   = 80
    }
  }
}
```

## Testing Comparison

CDK testing (native language):

```typescript
// CDK: Fine-grained assertions
test('Lambda has correct runtime', () => {
  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Lambda::Function', {
    Runtime: 'nodejs20.x',
  });
});
```

OpenTofu testing with Terratest:

```go
// Terratest: Integration test
func TestLambdaDeployment(t *testing.T) {
    opts := &terraform.Options{
        TerraformDir:    "../modules/lambda",
        TerraformBinary: "tofu",
    }
    defer terraform.Destroy(t, opts)
    terraform.InitAndApply(t, opts)

    functionName := terraform.Output(t, opts, "function_name")
    assert.Equal(t, "api-handler", functionName)
}
```

## When OpenTofu Wins

**Multi-cloud** - CDK is AWS-only. OpenTofu manages AWS, Azure, GCP, and 3,000+ other providers.

**Operations-focused teams** - HCL is readable without programming experience. CDK requires TypeScript/Python fluency.

**Existing Terraform investment** - Direct migration path with identical HCL syntax.

## When CDK Wins

**Developer-friendly abstractions** - L2/L3 constructs pre-configure complex multi-resource patterns (ECS + ALB + IAM) with sensible defaults.

**TypeScript/Python teams** - Developers use familiar languages, IDEs, and testing frameworks.

**CloudFormation ecosystem** - Benefits from CloudFormation's automatic rollback and deep AWS service integrations.

## Conclusion

OpenTofu is the better choice for multi-cloud environments and operations-focused teams. AWS CDK is the better choice for AWS-focused developer teams that want high-level constructs, native language testing, and CloudFormation's automatic rollback. CDK's L2/L3 constructs provide the best developer experience for complex AWS architectures; OpenTofu's module ecosystem provides better breadth across cloud providers.
