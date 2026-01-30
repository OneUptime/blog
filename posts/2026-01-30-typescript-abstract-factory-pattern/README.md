# How to Create Abstract Factory Pattern in TypeScript

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: TypeScript, Design Patterns, Architecture, OOP

Description: Implement the abstract factory pattern in TypeScript for creating families of related objects without specifying concrete classes.

---

The Abstract Factory pattern is one of the most powerful creational design patterns. It provides an interface for creating families of related objects without specifying their concrete classes. This pattern is particularly useful when your system needs to work with multiple families of products that must be used together.

In this guide, we will build several practical implementations of the Abstract Factory pattern in TypeScript, starting with the fundamentals and moving to real-world applications.

## Factory Pattern vs Abstract Factory Pattern

Before diving into the Abstract Factory, let's understand how it differs from the simple Factory pattern.

### Simple Factory Pattern

The Factory pattern creates objects of a single type based on input parameters.

```typescript
// Simple Factory - creates one type of product
interface Button {
  render(): void;
  onClick(handler: () => void): void;
}

class WindowsButton implements Button {
  render(): void {
    console.log("Rendering Windows-style button");
  }

  onClick(handler: () => void): void {
    console.log("Windows button clicked");
    handler();
  }
}

class MacButton implements Button {
  render(): void {
    console.log("Rendering Mac-style button");
  }

  onClick(handler: () => void): void {
    console.log("Mac button clicked");
    handler();
  }
}

// Simple factory function
function createButton(os: "windows" | "mac"): Button {
  if (os === "windows") {
    return new WindowsButton();
  }
  return new MacButton();
}
```

### Abstract Factory Pattern

The Abstract Factory creates entire families of related objects. Instead of creating just one product, it creates multiple products that belong together.

```typescript
// Abstract Factory - creates families of related products
interface Button {
  render(): void;
}

interface Checkbox {
  check(): void;
  uncheck(): void;
}

interface TextInput {
  setValue(value: string): void;
  getValue(): string;
}

// The Abstract Factory interface declares creation methods
// for each product in the family
interface UIComponentFactory {
  createButton(): Button;
  createCheckbox(): Checkbox;
  createTextInput(): TextInput;
}
```

### Key Differences

| Aspect | Factory Pattern | Abstract Factory Pattern |
|--------|-----------------|--------------------------|
| Products | Creates single product type | Creates families of related products |
| Complexity | Simpler to implement | More complex but more flexible |
| Consistency | No guarantee of product compatibility | Ensures products work together |
| Extension | Add new products by modifying factory | Add new families by creating new factory |
| Use Case | Single product variations | Multiple related products that must match |

## Building an Interface-Based Abstract Factory

Let's build a complete Abstract Factory implementation for a cross-platform UI toolkit.

### Step 1: Define Product Interfaces

First, we define interfaces for each product type in our family.

```typescript
// Product interface for buttons
interface Button {
  render(): string;
  onClick(callback: () => void): void;
  setLabel(label: string): void;
  getLabel(): string;
}

// Product interface for checkboxes
interface Checkbox {
  render(): string;
  isChecked(): boolean;
  toggle(): void;
  setLabel(label: string): void;
}

// Product interface for text inputs
interface TextInput {
  render(): string;
  setValue(value: string): void;
  getValue(): string;
  setPlaceholder(placeholder: string): void;
}

// Product interface for dropdown menus
interface Dropdown {
  render(): string;
  setOptions(options: string[]): void;
  getSelectedOption(): string | null;
  selectOption(index: number): void;
}
```

### Step 2: Create the Abstract Factory Interface

The abstract factory declares methods for creating each product type.

```typescript
// Abstract Factory interface
interface UIComponentFactory {
  createButton(): Button;
  createCheckbox(): Checkbox;
  createTextInput(): TextInput;
  createDropdown(): Dropdown;

  // Factory metadata
  getThemeName(): string;
}
```

### Step 3: Implement Concrete Products for Windows Theme

Now we create concrete implementations for the Windows theme family.

```typescript
// Windows Button implementation
class WindowsButton implements Button {
  private label: string = "";
  private clickHandler: (() => void) | null = null;

  render(): string {
    return `
      <button class="windows-btn" style="
        background: linear-gradient(#f0f0f0, #e0e0e0);
        border: 1px solid #707070;
        padding: 5px 15px;
        font-family: Segoe UI;
      ">${this.label}</button>
    `;
  }

  onClick(callback: () => void): void {
    this.clickHandler = callback;
  }

  setLabel(label: string): void {
    this.label = label;
  }

  getLabel(): string {
    return this.label;
  }
}

// Windows Checkbox implementation
class WindowsCheckbox implements Checkbox {
  private checked: boolean = false;
  private label: string = "";

  render(): string {
    const checkmark = this.checked ? "&#10003;" : "";
    return `
      <div class="windows-checkbox" style="font-family: Segoe UI;">
        <span style="
          display: inline-block;
          width: 13px;
          height: 13px;
          border: 1px solid #707070;
          background: white;
          text-align: center;
          line-height: 13px;
          font-size: 10px;
        ">${checkmark}</span>
        <span>${this.label}</span>
      </div>
    `;
  }

  isChecked(): boolean {
    return this.checked;
  }

  toggle(): void {
    this.checked = !this.checked;
  }

  setLabel(label: string): void {
    this.label = label;
  }
}

// Windows TextInput implementation
class WindowsTextInput implements TextInput {
  private value: string = "";
  private placeholder: string = "";

  render(): string {
    return `
      <input type="text"
        class="windows-input"
        value="${this.value}"
        placeholder="${this.placeholder}"
        style="
          border: 1px solid #707070;
          padding: 3px 5px;
          font-family: Segoe UI;
          background: white;
        "
      />
    `;
  }

  setValue(value: string): void {
    this.value = value;
  }

  getValue(): string {
    return this.value;
  }

  setPlaceholder(placeholder: string): void {
    this.placeholder = placeholder;
  }
}

// Windows Dropdown implementation
class WindowsDropdown implements Dropdown {
  private options: string[] = [];
  private selectedIndex: number = -1;

  render(): string {
    const optionsHtml = this.options
      .map((opt, i) => `<option ${i === this.selectedIndex ? "selected" : ""}>${opt}</option>`)
      .join("");

    return `
      <select class="windows-dropdown" style="
        border: 1px solid #707070;
        padding: 3px;
        font-family: Segoe UI;
        background: white;
      ">${optionsHtml}</select>
    `;
  }

  setOptions(options: string[]): void {
    this.options = options;
  }

  getSelectedOption(): string | null {
    if (this.selectedIndex >= 0 && this.selectedIndex < this.options.length) {
      return this.options[this.selectedIndex];
    }
    return null;
  }

  selectOption(index: number): void {
    if (index >= 0 && index < this.options.length) {
      this.selectedIndex = index;
    }
  }
}
```

### Step 4: Implement Concrete Products for Mac Theme

Next, we create the Mac theme family.

```typescript
// Mac Button implementation
class MacButton implements Button {
  private label: string = "";
  private clickHandler: (() => void) | null = null;

  render(): string {
    return `
      <button class="mac-btn" style="
        background: linear-gradient(#fafafa, #e8e8e8);
        border: 1px solid #c0c0c0;
        border-radius: 5px;
        padding: 6px 20px;
        font-family: -apple-system, BlinkMacSystemFont;
        box-shadow: 0 1px 1px rgba(0,0,0,0.1);
      ">${this.label}</button>
    `;
  }

  onClick(callback: () => void): void {
    this.clickHandler = callback;
  }

  setLabel(label: string): void {
    this.label = label;
  }

  getLabel(): string {
    return this.label;
  }
}

// Mac Checkbox implementation
class MacCheckbox implements Checkbox {
  private checked: boolean = false;
  private label: string = "";

  render(): string {
    const bgColor = this.checked ? "#007AFF" : "white";
    const checkmark = this.checked ? "&#10003;" : "";

    return `
      <div class="mac-checkbox" style="font-family: -apple-system;">
        <span style="
          display: inline-block;
          width: 14px;
          height: 14px;
          border: 1px solid #c0c0c0;
          border-radius: 3px;
          background: ${bgColor};
          color: white;
          text-align: center;
          line-height: 14px;
          font-size: 10px;
        ">${checkmark}</span>
        <span style="margin-left: 6px;">${this.label}</span>
      </div>
    `;
  }

  isChecked(): boolean {
    return this.checked;
  }

  toggle(): void {
    this.checked = !this.checked;
  }

  setLabel(label: string): void {
    this.label = label;
  }
}

// Mac TextInput implementation
class MacTextInput implements TextInput {
  private value: string = "";
  private placeholder: string = "";

  render(): string {
    return `
      <input type="text"
        class="mac-input"
        value="${this.value}"
        placeholder="${this.placeholder}"
        style="
          border: 1px solid #c0c0c0;
          border-radius: 5px;
          padding: 6px 10px;
          font-family: -apple-system;
          background: white;
          outline: none;
        "
      />
    `;
  }

  setValue(value: string): void {
    this.value = value;
  }

  getValue(): string {
    return this.value;
  }

  setPlaceholder(placeholder: string): void {
    this.placeholder = placeholder;
  }
}

// Mac Dropdown implementation
class MacDropdown implements Dropdown {
  private options: string[] = [];
  private selectedIndex: number = -1;

  render(): string {
    const optionsHtml = this.options
      .map((opt, i) => `<option ${i === this.selectedIndex ? "selected" : ""}>${opt}</option>`)
      .join("");

    return `
      <select class="mac-dropdown" style="
        border: 1px solid #c0c0c0;
        border-radius: 5px;
        padding: 6px 10px;
        font-family: -apple-system;
        background: white;
        appearance: none;
        background-image: url('data:image/svg+xml;...');
      ">${optionsHtml}</select>
    `;
  }

  setOptions(options: string[]): void {
    this.options = options;
  }

  getSelectedOption(): string | null {
    if (this.selectedIndex >= 0 && this.selectedIndex < this.options.length) {
      return this.options[this.selectedIndex];
    }
    return null;
  }

  selectOption(index: number): void {
    if (index >= 0 && index < this.options.length) {
      this.selectedIndex = index;
    }
  }
}
```

### Step 5: Implement Concrete Factories

Now we create the concrete factory classes that produce the product families.

```typescript
// Windows UI Component Factory
class WindowsUIFactory implements UIComponentFactory {
  createButton(): Button {
    return new WindowsButton();
  }

  createCheckbox(): Checkbox {
    return new WindowsCheckbox();
  }

  createTextInput(): TextInput {
    return new WindowsTextInput();
  }

  createDropdown(): Dropdown {
    return new WindowsDropdown();
  }

  getThemeName(): string {
    return "Windows";
  }
}

// Mac UI Component Factory
class MacUIFactory implements UIComponentFactory {
  createButton(): Button {
    return new MacButton();
  }

  createCheckbox(): Checkbox {
    return new MacCheckbox();
  }

  createTextInput(): TextInput {
    return new MacTextInput();
  }

  createDropdown(): Dropdown {
    return new MacDropdown();
  }

  getThemeName(): string {
    return "macOS";
  }
}
```

### Step 6: Create a Factory Provider

A factory provider helps select the appropriate factory at runtime.

```typescript
// Supported platforms
type Platform = "windows" | "mac" | "linux";

// Factory provider with automatic platform detection
class UIFactoryProvider {
  private static factories: Map<Platform, UIComponentFactory> = new Map();

  // Register a factory for a platform
  static registerFactory(platform: Platform, factory: UIComponentFactory): void {
    this.factories.set(platform, factory);
  }

  // Get factory for a specific platform
  static getFactory(platform: Platform): UIComponentFactory {
    const factory = this.factories.get(platform);
    if (!factory) {
      throw new Error(`No factory registered for platform: ${platform}`);
    }
    return factory;
  }

  // Auto-detect platform and return appropriate factory
  static getFactoryForCurrentPlatform(): UIComponentFactory {
    // In a real application, you would detect the actual platform
    const platform = this.detectPlatform();
    return this.getFactory(platform);
  }

  private static detectPlatform(): Platform {
    // Simulated platform detection
    // In a browser, you might check navigator.platform
    // In Node.js, you might check process.platform
    const userAgent = typeof navigator !== "undefined"
      ? navigator.userAgent.toLowerCase()
      : "";

    if (userAgent.includes("win")) return "windows";
    if (userAgent.includes("mac")) return "mac";
    return "linux";
  }
}

// Register default factories
UIFactoryProvider.registerFactory("windows", new WindowsUIFactory());
UIFactoryProvider.registerFactory("mac", new MacUIFactory());
```

### Step 7: Using the Abstract Factory

Here is how client code uses the abstract factory.

```typescript
// Application class that uses UI components
class Application {
  private factory: UIComponentFactory;
  private submitButton: Button;
  private agreeCheckbox: Checkbox;
  private nameInput: TextInput;
  private countryDropdown: Dropdown;

  constructor(factory: UIComponentFactory) {
    this.factory = factory;

    // Create all UI components using the factory
    // All components will have consistent styling
    this.submitButton = factory.createButton();
    this.agreeCheckbox = factory.createCheckbox();
    this.nameInput = factory.createTextInput();
    this.countryDropdown = factory.createDropdown();

    this.initializeComponents();
  }

  private initializeComponents(): void {
    this.submitButton.setLabel("Submit");
    this.submitButton.onClick(() => this.handleSubmit());

    this.agreeCheckbox.setLabel("I agree to the terms and conditions");

    this.nameInput.setPlaceholder("Enter your name");

    this.countryDropdown.setOptions([
      "United States",
      "Canada",
      "United Kingdom",
      "Germany",
      "France"
    ]);
  }

  private handleSubmit(): void {
    console.log("Form submitted!");
    console.log("Name:", this.nameInput.getValue());
    console.log("Country:", this.countryDropdown.getSelectedOption());
    console.log("Agreed:", this.agreeCheckbox.isChecked());
  }

  render(): string {
    return `
      <div class="form" data-theme="${this.factory.getThemeName()}">
        <h2>Registration Form (${this.factory.getThemeName()} Theme)</h2>

        <div class="form-group">
          <label>Name:</label>
          ${this.nameInput.render()}
        </div>

        <div class="form-group">
          <label>Country:</label>
          ${this.countryDropdown.render()}
        </div>

        <div class="form-group">
          ${this.agreeCheckbox.render()}
        </div>

        <div class="form-group">
          ${this.submitButton.render()}
        </div>
      </div>
    `;
  }
}

// Usage
const windowsApp = new Application(new WindowsUIFactory());
console.log(windowsApp.render());

const macApp = new Application(new MacUIFactory());
console.log(macApp.render());

// Or use the factory provider
const autoApp = new Application(UIFactoryProvider.getFactoryForCurrentPlatform());
console.log(autoApp.render());
```

## Real-World Example: Database Adapter Factory

Let's implement another practical example: a database adapter factory that supports multiple database systems.

### Define Database Product Interfaces

```typescript
// Query builder interface
interface QueryBuilder {
  select(columns: string[]): QueryBuilder;
  from(table: string): QueryBuilder;
  where(condition: string, params?: unknown[]): QueryBuilder;
  orderBy(column: string, direction?: "ASC" | "DESC"): QueryBuilder;
  limit(count: number): QueryBuilder;
  build(): { sql: string; params: unknown[] };
}

// Connection interface
interface DatabaseConnection {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  execute(sql: string, params?: unknown[]): Promise<unknown[]>;
  beginTransaction(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

// Migration runner interface
interface MigrationRunner {
  runMigrations(directory: string): Promise<void>;
  rollbackMigration(steps?: number): Promise<void>;
  getMigrationStatus(): Promise<MigrationStatus[]>;
}

interface MigrationStatus {
  name: string;
  appliedAt: Date | null;
  pending: boolean;
}

// Schema builder interface
interface SchemaBuilder {
  createTable(name: string, callback: (table: TableBuilder) => void): string;
  dropTable(name: string): string;
  alterTable(name: string, callback: (table: TableBuilder) => void): string;
}

interface TableBuilder {
  increments(column: string): ColumnBuilder;
  string(column: string, length?: number): ColumnBuilder;
  integer(column: string): ColumnBuilder;
  boolean(column: string): ColumnBuilder;
  timestamp(column: string): ColumnBuilder;
  text(column: string): ColumnBuilder;
  json(column: string): ColumnBuilder;
}

interface ColumnBuilder {
  nullable(): ColumnBuilder;
  notNullable(): ColumnBuilder;
  defaultTo(value: unknown): ColumnBuilder;
  primary(): ColumnBuilder;
  unique(): ColumnBuilder;
  references(column: string): ColumnBuilder;
  inTable(table: string): ColumnBuilder;
}
```

### Define the Database Factory Interface

```typescript
// Database configuration
interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  poolSize?: number;
}

// Abstract factory for database operations
interface DatabaseFactory {
  createConnection(config: DatabaseConfig): DatabaseConnection;
  createQueryBuilder(): QueryBuilder;
  createSchemaBuilder(): SchemaBuilder;
  createMigrationRunner(connection: DatabaseConnection): MigrationRunner;
  getDatabaseType(): string;
}
```

### Implement PostgreSQL Products

```typescript
// PostgreSQL Query Builder
class PostgresQueryBuilder implements QueryBuilder {
  private selectColumns: string[] = ["*"];
  private fromTable: string = "";
  private whereConditions: { condition: string; params: unknown[] }[] = [];
  private orderByClause: { column: string; direction: "ASC" | "DESC" } | null = null;
  private limitCount: number | null = null;
  private paramCounter: number = 1;

  select(columns: string[]): QueryBuilder {
    this.selectColumns = columns;
    return this;
  }

  from(table: string): QueryBuilder {
    this.fromTable = table;
    return this;
  }

  where(condition: string, params: unknown[] = []): QueryBuilder {
    // Convert ? placeholders to PostgreSQL $1, $2, etc.
    let pgCondition = condition;
    params.forEach(() => {
      pgCondition = pgCondition.replace("?", `$${this.paramCounter++}`);
    });
    this.whereConditions.push({ condition: pgCondition, params });
    return this;
  }

  orderBy(column: string, direction: "ASC" | "DESC" = "ASC"): QueryBuilder {
    this.orderByClause = { column, direction };
    return this;
  }

  limit(count: number): QueryBuilder {
    this.limitCount = count;
    return this;
  }

  build(): { sql: string; params: unknown[] } {
    const parts: string[] = [];
    const allParams: unknown[] = [];

    // SELECT clause
    parts.push(`SELECT ${this.selectColumns.join(", ")}`);

    // FROM clause
    parts.push(`FROM ${this.fromTable}`);

    // WHERE clause
    if (this.whereConditions.length > 0) {
      const conditions = this.whereConditions.map(w => w.condition);
      parts.push(`WHERE ${conditions.join(" AND ")}`);
      this.whereConditions.forEach(w => allParams.push(...w.params));
    }

    // ORDER BY clause
    if (this.orderByClause) {
      parts.push(`ORDER BY ${this.orderByClause.column} ${this.orderByClause.direction}`);
    }

    // LIMIT clause
    if (this.limitCount !== null) {
      parts.push(`LIMIT ${this.limitCount}`);
    }

    return {
      sql: parts.join(" "),
      params: allParams
    };
  }
}

// PostgreSQL Connection
class PostgresConnection implements DatabaseConnection {
  private config: DatabaseConfig;
  private connected: boolean = false;
  // In real implementation, this would be a pg.Pool instance
  private pool: unknown = null;

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    // Simulated connection
    console.log(`Connecting to PostgreSQL at ${this.config.host}:${this.config.port}`);
    // In real implementation: this.pool = new Pool(this.config);
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    console.log("Disconnecting from PostgreSQL");
    // In real implementation: await this.pool.end();
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async execute(sql: string, params: unknown[] = []): Promise<unknown[]> {
    if (!this.connected) {
      throw new Error("Not connected to database");
    }
    console.log("PostgreSQL executing:", sql, "with params:", params);
    // In real implementation: return (await this.pool.query(sql, params)).rows;
    return [];
  }

  async beginTransaction(): Promise<void> {
    await this.execute("BEGIN");
  }

  async commit(): Promise<void> {
    await this.execute("COMMIT");
  }

  async rollback(): Promise<void> {
    await this.execute("ROLLBACK");
  }
}

// PostgreSQL Schema Builder
class PostgresSchemaBuilder implements SchemaBuilder {
  createTable(name: string, callback: (table: TableBuilder) => void): string {
    const builder = new PostgresTableBuilder();
    callback(builder);
    const columns = builder.getColumns();
    return `CREATE TABLE ${name} (\n  ${columns.join(",\n  ")}\n)`;
  }

  dropTable(name: string): string {
    return `DROP TABLE IF EXISTS ${name} CASCADE`;
  }

  alterTable(name: string, callback: (table: TableBuilder) => void): string {
    const builder = new PostgresTableBuilder();
    callback(builder);
    const columns = builder.getColumns();
    return `ALTER TABLE ${name}\n  ${columns.map(c => `ADD COLUMN ${c}`).join(",\n  ")}`;
  }
}

// PostgreSQL Table Builder
class PostgresTableBuilder implements TableBuilder {
  private columns: string[] = [];

  getColumns(): string[] {
    return this.columns;
  }

  increments(column: string): ColumnBuilder {
    const builder = new PostgresColumnBuilder(column, "SERIAL");
    this.columns.push(builder.getDefinition());
    return builder;
  }

  string(column: string, length: number = 255): ColumnBuilder {
    const builder = new PostgresColumnBuilder(column, `VARCHAR(${length})`);
    this.columns.push(builder.getDefinition());
    return builder;
  }

  integer(column: string): ColumnBuilder {
    const builder = new PostgresColumnBuilder(column, "INTEGER");
    this.columns.push(builder.getDefinition());
    return builder;
  }

  boolean(column: string): ColumnBuilder {
    const builder = new PostgresColumnBuilder(column, "BOOLEAN");
    this.columns.push(builder.getDefinition());
    return builder;
  }

  timestamp(column: string): ColumnBuilder {
    const builder = new PostgresColumnBuilder(column, "TIMESTAMP WITH TIME ZONE");
    this.columns.push(builder.getDefinition());
    return builder;
  }

  text(column: string): ColumnBuilder {
    const builder = new PostgresColumnBuilder(column, "TEXT");
    this.columns.push(builder.getDefinition());
    return builder;
  }

  json(column: string): ColumnBuilder {
    const builder = new PostgresColumnBuilder(column, "JSONB");
    this.columns.push(builder.getDefinition());
    return builder;
  }
}

// PostgreSQL Column Builder
class PostgresColumnBuilder implements ColumnBuilder {
  private definition: string;

  constructor(column: string, type: string) {
    this.definition = `${column} ${type}`;
  }

  getDefinition(): string {
    return this.definition;
  }

  nullable(): ColumnBuilder {
    this.definition += " NULL";
    return this;
  }

  notNullable(): ColumnBuilder {
    this.definition += " NOT NULL";
    return this;
  }

  defaultTo(value: unknown): ColumnBuilder {
    if (typeof value === "string") {
      this.definition += ` DEFAULT '${value}'`;
    } else {
      this.definition += ` DEFAULT ${value}`;
    }
    return this;
  }

  primary(): ColumnBuilder {
    this.definition += " PRIMARY KEY";
    return this;
  }

  unique(): ColumnBuilder {
    this.definition += " UNIQUE";
    return this;
  }

  references(column: string): ColumnBuilder {
    this.definition += ` REFERENCES ${column}`;
    return this;
  }

  inTable(table: string): ColumnBuilder {
    // Modify the REFERENCES clause to include table
    this.definition = this.definition.replace(" REFERENCES ", ` REFERENCES ${table}(`);
    this.definition += ")";
    return this;
  }
}
```

### Implement MySQL Products

```typescript
// MySQL Query Builder
class MySQLQueryBuilder implements QueryBuilder {
  private selectColumns: string[] = ["*"];
  private fromTable: string = "";
  private whereConditions: { condition: string; params: unknown[] }[] = [];
  private orderByClause: { column: string; direction: "ASC" | "DESC" } | null = null;
  private limitCount: number | null = null;

  select(columns: string[]): QueryBuilder {
    this.selectColumns = columns;
    return this;
  }

  from(table: string): QueryBuilder {
    this.fromTable = table;
    return this;
  }

  where(condition: string, params: unknown[] = []): QueryBuilder {
    // MySQL uses ? placeholders directly
    this.whereConditions.push({ condition, params });
    return this;
  }

  orderBy(column: string, direction: "ASC" | "DESC" = "ASC"): QueryBuilder {
    this.orderByClause = { column, direction };
    return this;
  }

  limit(count: number): QueryBuilder {
    this.limitCount = count;
    return this;
  }

  build(): { sql: string; params: unknown[] } {
    const parts: string[] = [];
    const allParams: unknown[] = [];

    // SELECT clause with backtick escaping for MySQL
    parts.push(`SELECT ${this.selectColumns.map(c => c === "*" ? c : `\`${c}\``).join(", ")}`);

    // FROM clause
    parts.push(`FROM \`${this.fromTable}\``);

    // WHERE clause
    if (this.whereConditions.length > 0) {
      const conditions = this.whereConditions.map(w => w.condition);
      parts.push(`WHERE ${conditions.join(" AND ")}`);
      this.whereConditions.forEach(w => allParams.push(...w.params));
    }

    // ORDER BY clause
    if (this.orderByClause) {
      parts.push(`ORDER BY \`${this.orderByClause.column}\` ${this.orderByClause.direction}`);
    }

    // LIMIT clause
    if (this.limitCount !== null) {
      parts.push(`LIMIT ${this.limitCount}`);
    }

    return {
      sql: parts.join(" "),
      params: allParams
    };
  }
}

// MySQL Connection
class MySQLConnection implements DatabaseConnection {
  private config: DatabaseConfig;
  private connected: boolean = false;

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    console.log(`Connecting to MySQL at ${this.config.host}:${this.config.port}`);
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    console.log("Disconnecting from MySQL");
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async execute(sql: string, params: unknown[] = []): Promise<unknown[]> {
    if (!this.connected) {
      throw new Error("Not connected to database");
    }
    console.log("MySQL executing:", sql, "with params:", params);
    return [];
  }

  async beginTransaction(): Promise<void> {
    await this.execute("START TRANSACTION");
  }

  async commit(): Promise<void> {
    await this.execute("COMMIT");
  }

  async rollback(): Promise<void> {
    await this.execute("ROLLBACK");
  }
}

// MySQL Schema Builder
class MySQLSchemaBuilder implements SchemaBuilder {
  createTable(name: string, callback: (table: TableBuilder) => void): string {
    const builder = new MySQLTableBuilder();
    callback(builder);
    const columns = builder.getColumns();
    return `CREATE TABLE \`${name}\` (\n  ${columns.join(",\n  ")}\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`;
  }

  dropTable(name: string): string {
    return `DROP TABLE IF EXISTS \`${name}\``;
  }

  alterTable(name: string, callback: (table: TableBuilder) => void): string {
    const builder = new MySQLTableBuilder();
    callback(builder);
    const columns = builder.getColumns();
    return `ALTER TABLE \`${name}\`\n  ${columns.map(c => `ADD COLUMN ${c}`).join(",\n  ")}`;
  }
}

// MySQL Table Builder
class MySQLTableBuilder implements TableBuilder {
  private columns: string[] = [];

  getColumns(): string[] {
    return this.columns;
  }

  increments(column: string): ColumnBuilder {
    const builder = new MySQLColumnBuilder(column, "INT UNSIGNED AUTO_INCREMENT");
    this.columns.push(builder.getDefinition());
    return builder;
  }

  string(column: string, length: number = 255): ColumnBuilder {
    const builder = new MySQLColumnBuilder(column, `VARCHAR(${length})`);
    this.columns.push(builder.getDefinition());
    return builder;
  }

  integer(column: string): ColumnBuilder {
    const builder = new MySQLColumnBuilder(column, "INT");
    this.columns.push(builder.getDefinition());
    return builder;
  }

  boolean(column: string): ColumnBuilder {
    const builder = new MySQLColumnBuilder(column, "TINYINT(1)");
    this.columns.push(builder.getDefinition());
    return builder;
  }

  timestamp(column: string): ColumnBuilder {
    const builder = new MySQLColumnBuilder(column, "TIMESTAMP");
    this.columns.push(builder.getDefinition());
    return builder;
  }

  text(column: string): ColumnBuilder {
    const builder = new MySQLColumnBuilder(column, "TEXT");
    this.columns.push(builder.getDefinition());
    return builder;
  }

  json(column: string): ColumnBuilder {
    const builder = new MySQLColumnBuilder(column, "JSON");
    this.columns.push(builder.getDefinition());
    return builder;
  }
}

// MySQL Column Builder
class MySQLColumnBuilder implements ColumnBuilder {
  private definition: string;

  constructor(column: string, type: string) {
    this.definition = `\`${column}\` ${type}`;
  }

  getDefinition(): string {
    return this.definition;
  }

  nullable(): ColumnBuilder {
    this.definition += " NULL";
    return this;
  }

  notNullable(): ColumnBuilder {
    this.definition += " NOT NULL";
    return this;
  }

  defaultTo(value: unknown): ColumnBuilder {
    if (typeof value === "string") {
      this.definition += ` DEFAULT '${value}'`;
    } else {
      this.definition += ` DEFAULT ${value}`;
    }
    return this;
  }

  primary(): ColumnBuilder {
    this.definition += " PRIMARY KEY";
    return this;
  }

  unique(): ColumnBuilder {
    this.definition += " UNIQUE";
    return this;
  }

  references(column: string): ColumnBuilder {
    this.definition += ` REFERENCES \`${column}\``;
    return this;
  }

  inTable(table: string): ColumnBuilder {
    this.definition = this.definition.replace(" REFERENCES ", ` REFERENCES \`${table}\`(`);
    this.definition += ")";
    return this;
  }
}
```

### Implement Database Factories

```typescript
// PostgreSQL Factory
class PostgresFactory implements DatabaseFactory {
  createConnection(config: DatabaseConfig): DatabaseConnection {
    return new PostgresConnection(config);
  }

  createQueryBuilder(): QueryBuilder {
    return new PostgresQueryBuilder();
  }

  createSchemaBuilder(): SchemaBuilder {
    return new PostgresSchemaBuilder();
  }

  createMigrationRunner(connection: DatabaseConnection): MigrationRunner {
    // Implementation would go here
    throw new Error("Migration runner not implemented in this example");
  }

  getDatabaseType(): string {
    return "PostgreSQL";
  }
}

// MySQL Factory
class MySQLFactory implements DatabaseFactory {
  createConnection(config: DatabaseConfig): DatabaseConnection {
    return new MySQLConnection(config);
  }

  createQueryBuilder(): QueryBuilder {
    return new MySQLQueryBuilder();
  }

  createSchemaBuilder(): SchemaBuilder {
    return new MySQLSchemaBuilder();
  }

  createMigrationRunner(connection: DatabaseConnection): MigrationRunner {
    // Implementation would go here
    throw new Error("Migration runner not implemented in this example");
  }

  getDatabaseType(): string {
    return "MySQL";
  }
}
```

### Using the Database Factory

```typescript
// Database service that uses the abstract factory
class DatabaseService {
  private factory: DatabaseFactory;
  private connection: DatabaseConnection | null = null;

  constructor(factory: DatabaseFactory) {
    this.factory = factory;
  }

  async initialize(config: DatabaseConfig): Promise<void> {
    this.connection = this.factory.createConnection(config);
    await this.connection.connect();
    console.log(`Connected to ${this.factory.getDatabaseType()}`);
  }

  async findUsers(active: boolean, limit: number = 10): Promise<unknown[]> {
    if (!this.connection) {
      throw new Error("Database not initialized");
    }

    const query = this.factory.createQueryBuilder()
      .select(["id", "name", "email", "created_at"])
      .from("users")
      .where("active = ?", [active])
      .orderBy("created_at", "DESC")
      .limit(limit)
      .build();

    return this.connection.execute(query.sql, query.params);
  }

  createUsersTableSQL(): string {
    const schema = this.factory.createSchemaBuilder();

    return schema.createTable("users", (table) => {
      table.increments("id").primary();
      table.string("name", 100).notNullable();
      table.string("email", 255).notNullable().unique();
      table.boolean("active").defaultTo(true);
      table.text("bio").nullable();
      table.json("preferences").nullable();
      table.timestamp("created_at").defaultTo("CURRENT_TIMESTAMP");
    });
  }

  async shutdown(): Promise<void> {
    if (this.connection) {
      await this.connection.disconnect();
      this.connection = null;
    }
  }
}

// Usage example
async function main(): Promise<void> {
  const config: DatabaseConfig = {
    host: "localhost",
    port: 5432,
    database: "myapp",
    username: "admin",
    password: "secret"
  };

  // Use PostgreSQL
  const pgService = new DatabaseService(new PostgresFactory());
  await pgService.initialize(config);
  console.log(pgService.createUsersTableSQL());
  await pgService.findUsers(true, 20);
  await pgService.shutdown();

  // Use MySQL
  const mysqlConfig = { ...config, port: 3306 };
  const mysqlService = new DatabaseService(new MySQLFactory());
  await mysqlService.initialize(mysqlConfig);
  console.log(mysqlService.createUsersTableSQL());
  await mysqlService.findUsers(true, 20);
  await mysqlService.shutdown();
}

main().catch(console.error);
```

## When to Use Abstract Factory

The Abstract Factory pattern is the right choice in these scenarios:

### Use Abstract Factory When

| Scenario | Example |
|----------|---------|
| Multiple product families exist | Windows, Mac, Linux UI components |
| Products must be used together | Button, Checkbox, Input from same theme |
| System configured with one family | App configured for PostgreSQL or MySQL |
| Library hides implementation | SDK that supports multiple backends |
| Testing requires mock families | Replace real database with in-memory mock |

### Avoid Abstract Factory When

| Scenario | Better Alternative |
|----------|-------------------|
| Only one product type | Simple Factory or Factory Method |
| Products do not relate to each other | Individual factories |
| No family variations expected | Direct instantiation |
| Simple object creation | Constructor or builder pattern |

## Advanced Patterns

### Combining with Dependency Injection

```typescript
// Token for dependency injection
const DATABASE_FACTORY = Symbol("DatabaseFactory");

// Container configuration
class Container {
  private static bindings = new Map<symbol, unknown>();

  static bind<T>(token: symbol, implementation: T): void {
    this.bindings.set(token, implementation);
  }

  static resolve<T>(token: symbol): T {
    const implementation = this.bindings.get(token);
    if (!implementation) {
      throw new Error(`No binding found for ${String(token)}`);
    }
    return implementation as T;
  }
}

// Configure based on environment
function configureContainer(environment: string): void {
  if (environment === "production") {
    Container.bind<DatabaseFactory>(DATABASE_FACTORY, new PostgresFactory());
  } else if (environment === "development") {
    Container.bind<DatabaseFactory>(DATABASE_FACTORY, new MySQLFactory());
  } else {
    // Test environment could use an in-memory factory
    Container.bind<DatabaseFactory>(DATABASE_FACTORY, new PostgresFactory());
  }
}

// Usage in application code
class UserRepository {
  private dbService: DatabaseService;

  constructor() {
    const factory = Container.resolve<DatabaseFactory>(DATABASE_FACTORY);
    this.dbService = new DatabaseService(factory);
  }
}
```

### Factory Registry Pattern

```typescript
// Registry for dynamically registering factories
class DatabaseFactoryRegistry {
  private static factories = new Map<string, DatabaseFactory>();

  static register(name: string, factory: DatabaseFactory): void {
    this.factories.set(name.toLowerCase(), factory);
  }

  static get(name: string): DatabaseFactory {
    const factory = this.factories.get(name.toLowerCase());
    if (!factory) {
      const available = Array.from(this.factories.keys()).join(", ");
      throw new Error(
        `Unknown database type: ${name}. Available: ${available}`
      );
    }
    return factory;
  }

  static list(): string[] {
    return Array.from(this.factories.keys());
  }
}

// Register factories at application startup
DatabaseFactoryRegistry.register("postgres", new PostgresFactory());
DatabaseFactoryRegistry.register("postgresql", new PostgresFactory());
DatabaseFactoryRegistry.register("mysql", new MySQLFactory());
DatabaseFactoryRegistry.register("mariadb", new MySQLFactory());

// Usage with configuration
interface AppConfig {
  database: {
    type: string;
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
  };
}

function createDatabaseService(config: AppConfig): DatabaseService {
  const factory = DatabaseFactoryRegistry.get(config.database.type);
  return new DatabaseService(factory);
}
```

## Summary

The Abstract Factory pattern provides a powerful way to create families of related objects while keeping your code flexible and maintainable. Key takeaways:

1. Use Abstract Factory when you need to create multiple related objects that must work together
2. Define interfaces for both products and factories to enable easy extension
3. Each concrete factory creates a complete family of compatible products
4. Client code works with factories and products through interfaces only
5. Adding new product families requires creating new concrete factories without modifying existing code
6. Combine with dependency injection for maximum flexibility in configuring your application

The pattern is particularly valuable in applications that need to support multiple platforms, themes, database backends, or any other scenario where you have families of related objects that vary together.
