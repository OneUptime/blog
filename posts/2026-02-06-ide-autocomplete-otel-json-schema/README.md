# How to Use IDE Auto-Completion and Validation with the OpenTelemetry Configuration JSON Schema

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, IDE, JSON Schema, Auto-Completion, VS Code

Description: Set up your IDE to provide auto-completion and real-time validation for OpenTelemetry declarative YAML configuration files.

Writing OpenTelemetry configuration YAML by hand means you need to remember exact field names, valid values, and the nested structure of processors, exporters, and samplers. This is error-prone and slow. By connecting the OpenTelemetry JSON schema to your IDE, you get auto-completion, inline documentation, and real-time validation as you type.

## Setting Up VS Code with YAML Schema Association

VS Code with the Red Hat YAML extension is the most common setup. Install the extension first:

```bash
code --install-extension redhat.vscode-yaml
```

Then configure the schema association in your workspace or user settings:

```json
// .vscode/settings.json
{
  "yaml.schemas": {
    "https://raw.githubusercontent.com/open-telemetry/opentelemetry-configuration/main/schema/opentelemetry_configuration.json": [
      "otel-config.yaml",
      "otel-*.yaml",
      "**/otel/**/*.yaml"
    ]
  },
  "yaml.validate": true,
  "yaml.completion": true,
  "yaml.hover": true
}
```

This tells the YAML extension to apply the OpenTelemetry schema to any file matching those patterns.

### What You Get

Once configured, VS Code provides:

1. **Auto-completion**: Type a few characters and press Ctrl+Space to see valid field names at any level of the configuration hierarchy.

2. **Inline documentation**: Hover over any field to see its description, type, and valid values directly from the schema.

3. **Real-time validation**: Errors appear as red underlines immediately, before you save or run any command.

4. **Required field hints**: The editor warns you when required fields are missing.

## Using a Local Schema File

If you want to pin the schema version or use it offline, download the schema and reference it locally:

```bash
# Download the schema to your project
mkdir -p .schemas
curl -o .schemas/otel-config-schema.json \
  https://raw.githubusercontent.com/open-telemetry/opentelemetry-configuration/main/schema/opentelemetry_configuration.json
```

Update your settings to reference the local file:

```json
// .vscode/settings.json
{
  "yaml.schemas": {
    "./.schemas/otel-config-schema.json": [
      "otel-*.yaml",
      "config/otel/**/*.yaml"
    ]
  }
}
```

## In-File Schema Association

You can also associate the schema directly in your YAML file using a modeline comment. This works regardless of project settings:

```yaml
# yaml-language-server: $schema=https://raw.githubusercontent.com/open-telemetry/opentelemetry-configuration/main/schema/opentelemetry_configuration.json

file_format: "0.3"

resource:
  attributes:
    service.name: "my-service"

tracer_provider:
  processors:
    - batch:
        exporter:
          otlp:
            endpoint: "http://localhost:4317"
            protocol: "grpc"
```

The `yaml-language-server` directive on the first line tells any compatible editor to use that schema. This is portable across IDEs and team members.

## Setting Up JetBrains IDEs (IntelliJ, WebStorm, GoLand)

JetBrains IDEs have built-in YAML schema support. Configure it through settings:

1. Open **Settings/Preferences** > **Languages & Frameworks** > **Schemas and DTDs** > **JSON Schema Mappings**
2. Click the **+** button to add a new mapping
3. Set the schema URL: `https://raw.githubusercontent.com/open-telemetry/opentelemetry-configuration/main/schema/opentelemetry_configuration.json`
4. Add file path patterns: `otel-*.yaml`

Alternatively, add it to your shared project configuration:

```xml
<!-- .idea/jsonSchemas.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<project version="4">
  <component name="JsonSchemaMappingsProjectConfiguration">
    <state>
      <map>
        <entry key="OpenTelemetry Config">
          <value>
            <SchemaInfo>
              <option name="name" value="OpenTelemetry Config" />
              <option name="relativePathReference"
                value="https://raw.githubusercontent.com/open-telemetry/opentelemetry-configuration/main/schema/opentelemetry_configuration.json" />
              <option name="patterns">
                <list>
                  <Item>
                    <option name="path" value="otel-*.yaml" />
                  </Item>
                </list>
              </option>
            </SchemaInfo>
          </value>
        </entry>
      </map>
    </state>
  </component>
</project>
```

## Setting Up Neovim with yaml-language-server

If you use Neovim with the built-in LSP client and `yaml-language-server`, configure schema associations in your LSP settings:

```lua
-- lua/lsp/yamlls.lua
local lspconfig = require('lspconfig')

lspconfig.yamlls.setup({
  settings = {
    yaml = {
      schemas = {
        ["https://raw.githubusercontent.com/open-telemetry/opentelemetry-configuration/main/schema/opentelemetry_configuration.json"] = {
          "otel-*.yaml",
          "**/otel/**/*.yaml",
        },
      },
      validate = true,
      completion = true,
      hover = true,
    },
  },
})
```

## SchemaStore Integration

The JSON Schema Store (schemastore.org) aggregates schemas for hundreds of file formats. Once the OpenTelemetry configuration schema is added there (contributions are welcome), editors that use SchemaStore will automatically detect and apply the schema for matching files without any manual configuration.

Check if it is available:

```json
// If available in SchemaStore, the YAML extension auto-detects it
// and you do not need any of the above manual configuration
{
  "yaml.schemaStore.enable": true
}
```

## Dealing with Environment Variable Placeholders

One common issue: the `${ENV_VAR}` substitution syntax causes schema validation warnings because the editor sees a string where it expects a number or boolean. You have a few options:

```yaml
# This will show a warning because the schema expects a number
sampler:
  parent_based:
    root:
      trace_id_ratio_based:
        ratio: ${SAMPLE_RATIO:-0.1}  # warning: expected number, got string
```

Option 1: Use the YAML comment to suppress the warning for that line (if your extension supports it).

Option 2: Keep defaults as literal values and only override with env vars at deployment time.

Option 3: Accept the warnings for env-var lines and focus on catching structural errors.

## Wrapping Up

Setting up schema-backed auto-completion takes five minutes and saves time on every configuration change going forward. You stop guessing field names, immediately see when a value is invalid, and get inline documentation without switching to a browser. Whether you use VS Code, a JetBrains IDE, or Neovim, the YAML language server and the OpenTelemetry JSON schema work together to make configuration authoring faster and more reliable.
