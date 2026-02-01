# How to Implement Multi-tenancy in Rails Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ruby, Rails, Multi-tenancy, SaaS, Database, Architecture

Description: Learn how to implement multi-tenancy in Ruby on Rails applications. This guide covers shared database, schema-based, and database-per-tenant approaches with practical examples and production best practices.

---

> Multi-tenancy is the backbone of SaaS applications. It allows a single application instance to serve multiple customers (tenants) while keeping their data isolated and secure. Getting multi-tenancy right is critical for data security, performance, and scalability.

Whether you are building a new SaaS product or converting an existing application to support multiple tenants, Rails provides flexible options for implementing multi-tenancy. This guide covers the three main approaches and helps you choose the right one for your use case.

---

## Understanding Multi-tenancy

Multi-tenancy is an architecture where a single instance of software serves multiple tenants. Each tenant is a group of users (typically an organization or company) sharing common access with specific privileges.

### Multi-tenancy Approaches

```mermaid
flowchart TB
    subgraph Shared Database
        SD[Single Database]
        SD --> T1[Tenant 1 Data]
        SD --> T2[Tenant 2 Data]
        SD --> T3[Tenant 3 Data]
        Note1[All data in same tables<br/>Tenant ID column for isolation]
    end
    
    subgraph Schema Based
        SB[Single Database]
        SB --> S1[Schema: tenant_1]
        SB --> S2[Schema: tenant_2]
        SB --> S3[Schema: tenant_3]
        Note2[Separate schemas per tenant<br/>Same table structure]
    end
    
    subgraph Database Per Tenant
        DB1[(Database: tenant_1)]
        DB2[(Database: tenant_2)]
        DB3[(Database: tenant_3)]
        Note3[Complete isolation<br/>Separate databases]
    end
```

### Choosing the Right Approach

| Approach | Isolation | Complexity | Cost | Best For |
|----------|-----------|------------|------|----------|
| Shared Database | Low | Low | Low | Small SaaS, startups |
| Schema Based | Medium | Medium | Medium | B2B SaaS with compliance needs |
| Database Per Tenant | High | High | High | Enterprise, strict compliance |

```mermaid
flowchart TD
    Start[Choose Multi-tenancy Approach] --> Q1{Strict data<br/>isolation required?}
    Q1 -->|Yes| Q2{Can afford<br/>per-tenant infra?}
    Q1 -->|No| SharedDB[Shared Database<br/>with tenant_id]
    Q2 -->|Yes| DBPerTenant[Database Per Tenant]
    Q2 -->|No| SchemaBased[Schema Based]
    
    SharedDB --> Benefits1[Simple migrations<br/>Easy aggregations<br/>Lower cost]
    SchemaBased --> Benefits2[Good isolation<br/>Per-tenant indexes<br/>Moderate complexity]
    DBPerTenant --> Benefits3[Maximum isolation<br/>Independent backups<br/>Compliance friendly]
```

---

## Setting Up the Project

Let's start with a fresh Rails application that we will make multi-tenant:

```bash
# Create a new Rails application
rails new multi_tenant_app --database=postgresql

# Navigate to the project
cd multi_tenant_app

# Add required gems to Gemfile
```

Add these gems to your `Gemfile`:

```ruby
# Gemfile

# Core Rails gems
gem 'rails', '~> 7.1'
gem 'pg', '~> 1.5'
gem 'puma', '~> 6.0'

# Multi-tenancy gems
gem 'acts_as_tenant', '~> 1.0'      # For shared database approach
gem 'apartment', '~> 2.2'            # For schema-based approach (optional)
gem 'ros-apartment', '~> 2.11'       # Modern fork of apartment gem

# Authentication and security
gem 'devise', '~> 4.9'
gem 'pundit', '~> 2.3'

# Background jobs
gem 'sidekiq', '~> 7.2'

# Caching
gem 'redis', '~> 5.0'

group :development, :test do
  gem 'rspec-rails', '~> 6.1'
  gem 'factory_bot_rails', '~> 6.4'
  gem 'faker', '~> 3.2'
  gem 'database_cleaner-active_record', '~> 2.1'
end
```

Install the gems:

```bash
bundle install
```

---

## Approach 1: Shared Database with Tenant ID

This is the simplest and most common approach. All tenants share the same database and tables, with a `tenant_id` column identifying which tenant owns each record.

### Database Architecture

```mermaid
erDiagram
    TENANTS ||--o{ USERS : has
    TENANTS ||--o{ PROJECTS : has
    TENANTS ||--o{ INVOICES : has
    PROJECTS ||--o{ TASKS : has
    
    TENANTS {
        bigint id PK
        string name
        string subdomain UK
        string settings
        datetime created_at
    }
    
    USERS {
        bigint id PK
        bigint tenant_id FK
        string email
        string role
    }
    
    PROJECTS {
        bigint id PK
        bigint tenant_id FK
        string name
        text description
    }
    
    TASKS {
        bigint id PK
        bigint tenant_id FK
        bigint project_id FK
        string title
        string status
    }
    
    INVOICES {
        bigint id PK
        bigint tenant_id FK
        decimal amount
        string status
    }
```

### Creating the Tenant Model

Generate the tenant model and migration:

```bash
# Generate the Tenant model
rails generate model Tenant name:string subdomain:string:uniq settings:jsonb

# Create the migration
```

```ruby
# db/migrate/XXXXXX_create_tenants.rb

class CreateTenants < ActiveRecord::Migration[7.1]
  def change
    # Enable UUID extension if using UUIDs
    # enable_extension 'pgcrypto' unless extension_enabled?('pgcrypto')
    
    create_table :tenants do |t|
      # Basic tenant information
      t.string :name, null: false
      t.string :subdomain, null: false
      
      # Tenant status
      t.string :status, default: 'active', null: false
      t.string :plan, default: 'free', null: false
      
      # Settings stored as JSON
      t.jsonb :settings, default: {}
      
      # Metadata
      t.datetime :trial_ends_at
      t.datetime :suspended_at
      
      t.timestamps
    end
    
    # Indexes for fast lookups
    add_index :tenants, :subdomain, unique: true
    add_index :tenants, :status
    add_index :tenants, :plan
    
    # Index for JSON queries
    add_index :tenants, :settings, using: :gin
  end
end
```

### Tenant Model Implementation

```ruby
# app/models/tenant.rb

class Tenant < ApplicationRecord
  # Associations
  has_many :users, dependent: :destroy
  has_many :projects, dependent: :destroy
  has_many :invoices, dependent: :destroy
  
  # Validations
  validates :name, presence: true, length: { maximum: 255 }
  validates :subdomain, presence: true,
                        uniqueness: { case_sensitive: false },
                        length: { minimum: 3, maximum: 63 },
                        format: {
                          with: /\A[a-z0-9]+(-[a-z0-9]+)*\z/,
                          message: 'must contain only lowercase letters, numbers, and hyphens'
                        }
  
  validates :status, inclusion: { in: %w[active suspended trial] }
  validates :plan, inclusion: { in: %w[free starter professional enterprise] }
  
  # Reserved subdomains that cannot be used by tenants
  RESERVED_SUBDOMAINS = %w[
    www api admin app dashboard billing support help docs
    status blog marketing sales demo staging production
  ].freeze
  
  validate :subdomain_not_reserved
  
  # Scopes for querying tenants
  scope :active, -> { where(status: 'active') }
  scope :suspended, -> { where(status: 'suspended') }
  scope :trial, -> { where(status: 'trial') }
  scope :on_plan, ->(plan) { where(plan: plan) }
  
  # Callbacks
  before_validation :normalize_subdomain
  
  # Settings accessors with defaults
  def timezone
    settings['timezone'] || 'UTC'
  end
  
  def timezone=(value)
    settings['timezone'] = value
  end
  
  def currency
    settings['currency'] || 'USD'
  end
  
  def currency=(value)
    settings['currency'] = value
  end
  
  def logo_url
    settings['logo_url']
  end
  
  def logo_url=(value)
    settings['logo_url'] = value
  end
  
  # Check if tenant is active and can access the application
  def accessible?
    status == 'active' || (status == 'trial' && trial_active?)
  end
  
  # Check if trial period is still valid
  def trial_active?
    trial_ends_at.present? && trial_ends_at > Time.current
  end
  
  # Suspend the tenant
  def suspend!(reason: nil)
    update!(
      status: 'suspended',
      suspended_at: Time.current,
      settings: settings.merge('suspension_reason' => reason)
    )
  end
  
  # Reactivate suspended tenant
  def reactivate!
    update!(
      status: 'active',
      suspended_at: nil,
      settings: settings.except('suspension_reason')
    )
  end
  
  private
  
  # Normalize subdomain to lowercase
  def normalize_subdomain
    self.subdomain = subdomain&.downcase&.strip
  end
  
  # Ensure subdomain is not in reserved list
  def subdomain_not_reserved
    if RESERVED_SUBDOMAINS.include?(subdomain)
      errors.add(:subdomain, 'is reserved and cannot be used')
    end
  end
end
```

### Adding Tenant Reference to Models

Create a concern for tenant-scoped models:

```ruby
# app/models/concerns/tenant_scoped.rb

module TenantScoped
  extend ActiveSupport::Concern
  
  included do
    # Set up the tenant association
    belongs_to :tenant
    
    # Validate tenant presence
    validates :tenant_id, presence: true
    
    # Default scope to filter by current tenant
    # This is set by acts_as_tenant gem or custom implementation
    
    # Callback to set tenant automatically
    before_validation :set_tenant, on: :create
  end
  
  private
  
  # Automatically set the tenant from the current context
  def set_tenant
    self.tenant_id ||= Current.tenant&.id
  end
end
```

### Using acts_as_tenant Gem

The `acts_as_tenant` gem simplifies shared database multi-tenancy:

```ruby
# app/models/project.rb

class Project < ApplicationRecord
  # This automatically scopes all queries to the current tenant
  # and sets tenant_id on creation
  acts_as_tenant :tenant
  
  # Associations
  has_many :tasks, dependent: :destroy
  belongs_to :owner, class_name: 'User', optional: true
  
  # Validations
  validates :name, presence: true, length: { maximum: 255 }
  validates :name, uniqueness: { scope: :tenant_id }
  
  # Scopes
  scope :active, -> { where(archived: false) }
  scope :archived, -> { where(archived: true) }
  
  # Callbacks
  before_create :set_default_settings
  
  private
  
  def set_default_settings
    self.settings ||= {}
  end
end
```

```ruby
# app/models/task.rb

class Task < ApplicationRecord
  acts_as_tenant :tenant
  
  # Associations
  belongs_to :project
  belongs_to :assignee, class_name: 'User', optional: true
  
  # Validations
  validates :title, presence: true, length: { maximum: 500 }
  validates :status, inclusion: { in: %w[pending in_progress completed cancelled] }
  
  # Scopes
  scope :pending, -> { where(status: 'pending') }
  scope :in_progress, -> { where(status: 'in_progress') }
  scope :completed, -> { where(status: 'completed') }
  scope :due_soon, -> { where('due_date <= ?', 7.days.from_now) }
  
  # State transitions
  def start!
    update!(status: 'in_progress', started_at: Time.current)
  end
  
  def complete!
    update!(status: 'completed', completed_at: Time.current)
  end
  
  def cancel!
    update!(status: 'cancelled', cancelled_at: Time.current)
  end
end
```

### Setting the Current Tenant

Create a concern for controllers to set the current tenant:

```ruby
# app/controllers/concerns/set_current_tenant.rb

module SetCurrentTenant
  extend ActiveSupport::Concern
  
  included do
    # Set tenant before any action
    before_action :set_current_tenant_from_request
    
    # Make current tenant available to views
    helper_method :current_tenant
  end
  
  private
  
  # Determine current tenant from subdomain or header
  def set_current_tenant_from_request
    tenant = find_tenant_from_subdomain || find_tenant_from_header
    
    if tenant.nil?
      render_tenant_not_found
      return
    end
    
    unless tenant.accessible?
      render_tenant_not_accessible(tenant)
      return
    end
    
    # Set the tenant for acts_as_tenant
    ActsAsTenant.current_tenant = tenant
    
    # Also store in Current for models that need it
    Current.tenant = tenant
  end
  
  # Find tenant from subdomain (e.g., acme.myapp.com)
  def find_tenant_from_subdomain
    subdomain = extract_subdomain
    return nil if subdomain.blank?
    
    Tenant.find_by(subdomain: subdomain)
  end
  
  # Find tenant from X-Tenant-ID header (for API requests)
  def find_tenant_from_header
    tenant_id = request.headers['X-Tenant-ID']
    return nil if tenant_id.blank?
    
    Tenant.find_by(id: tenant_id)
  end
  
  # Extract subdomain from request host
  def extract_subdomain
    # Skip for localhost and IP addresses
    return nil if request.host.match?(/\A(\d+\.){3}\d+\z/)
    return nil if request.host == 'localhost'
    
    # Extract first subdomain
    parts = request.host.split('.')
    return nil if parts.length < 3
    
    parts.first
  end
  
  # Current tenant accessor
  def current_tenant
    ActsAsTenant.current_tenant
  end
  
  # Render 404 for missing tenant
  def render_tenant_not_found
    respond_to do |format|
      format.html { render 'errors/tenant_not_found', status: :not_found }
      format.json { render json: { error: 'Tenant not found' }, status: :not_found }
    end
  end
  
  # Render error for inaccessible tenant
  def render_tenant_not_accessible(tenant)
    message = case tenant.status
              when 'suspended'
                'This account has been suspended. Please contact support.'
              when 'trial'
                'Your trial period has expired. Please upgrade to continue.'
              else
                'This account is not accessible.'
              end
    
    respond_to do |format|
      format.html { render 'errors/tenant_not_accessible', locals: { message: message }, status: :forbidden }
      format.json { render json: { error: message }, status: :forbidden }
    end
  end
end
```

### Application Controller Setup

```ruby
# app/controllers/application_controller.rb

class ApplicationController < ActionController::Base
  include SetCurrentTenant
  
  # Protect from CSRF attacks
  protect_from_forgery with: :exception
  
  # Rescue from tenant-related errors
  rescue_from ActsAsTenant::Errors::NoTenantSet do |exception|
    Rails.logger.error "No tenant set: #{exception.message}"
    redirect_to root_url(subdomain: false), alert: 'Please select an organization.'
  end
end
```

### Current Attributes for Request Context

```ruby
# app/models/current.rb

class Current < ActiveSupport::CurrentAttributes
  # Tenant context
  attribute :tenant
  
  # User context (from Devise or custom auth)
  attribute :user
  
  # Request context
  attribute :request_id
  attribute :user_agent
  attribute :ip_address
  
  # Convenience methods
  def tenant_id
    tenant&.id
  end
  
  def user_id
    user&.id
  end
end
```

### Migration for Tenant-scoped Tables

```ruby
# db/migrate/XXXXXX_create_projects.rb

class CreateProjects < ActiveRecord::Migration[7.1]
  def change
    create_table :projects do |t|
      # Tenant reference - critical for multi-tenancy
      t.references :tenant, null: false, foreign_key: { on_delete: :cascade }
      
      # Project fields
      t.string :name, null: false
      t.text :description
      t.references :owner, foreign_key: { to_table: :users }, null: true
      
      # Status and settings
      t.boolean :archived, default: false, null: false
      t.jsonb :settings, default: {}
      
      t.timestamps
    end
    
    # Composite index for tenant-scoped queries
    # This is critical for performance in multi-tenant apps
    add_index :projects, [:tenant_id, :name], unique: true
    add_index :projects, [:tenant_id, :archived]
    add_index :projects, [:tenant_id, :created_at]
  end
end
```

```ruby
# db/migrate/XXXXXX_create_tasks.rb

class CreateTasks < ActiveRecord::Migration[7.1]
  def change
    create_table :tasks do |t|
      t.references :tenant, null: false, foreign_key: { on_delete: :cascade }
      t.references :project, null: false, foreign_key: { on_delete: :cascade }
      t.references :assignee, foreign_key: { to_table: :users }, null: true
      
      t.string :title, null: false
      t.text :description
      t.string :status, default: 'pending', null: false
      t.integer :priority, default: 0
      t.date :due_date
      
      # Timestamps for state transitions
      t.datetime :started_at
      t.datetime :completed_at
      t.datetime :cancelled_at
      
      t.timestamps
    end
    
    # Performance indexes for common queries
    add_index :tasks, [:tenant_id, :status]
    add_index :tasks, [:tenant_id, :due_date]
    add_index :tasks, [:tenant_id, :project_id, :status]
    add_index :tasks, [:tenant_id, :assignee_id, :status]
  end
end
```

---

## Approach 2: Schema-Based Multi-tenancy

Schema-based multi-tenancy creates a separate PostgreSQL schema for each tenant. This provides better isolation while still using a single database.

### Schema Architecture

```mermaid
flowchart TB
    subgraph Database
        Public[Public Schema<br/>Shared tables]
        
        subgraph Tenant Schemas
            S1[Schema: tenant_acme]
            S2[Schema: tenant_globex]
            S3[Schema: tenant_initech]
        end
        
        Public --> |tenants table| S1
        Public --> |tenants table| S2
        Public --> |tenants table| S3
        
        S1 --> |users, projects, tasks| T1Data[Acme Data]
        S2 --> |users, projects, tasks| T2Data[Globex Data]
        S3 --> |users, projects, tasks| T3Data[Initech Data]
    end
```

### Setting Up Apartment Gem

Configure the `ros-apartment` gem (modern fork of apartment):

```ruby
# config/initializers/apartment.rb

require 'apartment/elevators/subdomain'

Apartment.configure do |config|
  # Tables that should remain in the public schema
  # These are shared across all tenants
  config.excluded_models = %w[
    Tenant
    TenantBillingPlan
    SystemSetting
    AdminUser
  ]
  
  # Use PostgreSQL schemas (alternatively: :database for separate databases)
  config.use_schemas = true
  
  # Prepend schema path so tenant schema is searched first
  config.prepend_environment = false
  
  # Automatically switch to schema based on subdomain
  config.tenant_names = -> { Tenant.pluck(:subdomain) }
  
  # Schema naming convention
  config.schema_format = :sql
  
  # Seed each tenant schema after creation
  config.seed_after_create = true
  
  # Handle persistent schemas like extensions
  config.persistent_schemas = ['shared_extensions']
end

# Apartment elevator configuration
Rails.application.config.middleware.use Apartment::Elevators::Subdomain
```

### Apartment Elevators

Create a custom elevator for more control over tenant switching:

```ruby
# lib/apartment/elevators/custom_subdomain.rb

module Apartment
  module Elevators
    class CustomSubdomain < Subdomain
      # Custom logic for determining tenant from request
      def parse_tenant_name(request)
        # Extract subdomain
        subdomain = extract_subdomain(request)
        
        # Return nil for public pages
        return nil if subdomain.blank?
        return nil if excluded_subdomain?(subdomain)
        
        # Find tenant and return schema name
        tenant = Tenant.find_by(subdomain: subdomain)
        return nil unless tenant&.accessible?
        
        tenant.subdomain
      end
      
      private
      
      def extract_subdomain(request)
        host = request.host
        
        # Skip for localhost
        return nil if host == 'localhost'
        
        # Skip for IP addresses
        return nil if host.match?(/\A(\d+\.){3}\d+\z/)
        
        # Extract first subdomain
        parts = host.split('.')
        return nil if parts.length < 3
        
        parts.first.downcase
      end
      
      def excluded_subdomain?(subdomain)
        excluded = %w[www api admin]
        excluded.include?(subdomain)
      end
    end
  end
end
```

### Creating Tenant Schemas

```ruby
# app/services/tenant_provisioning_service.rb

class TenantProvisioningService
  class ProvisioningError < StandardError; end
  
  def initialize(tenant)
    @tenant = tenant
  end
  
  def provision!
    ActiveRecord::Base.transaction do
      create_schema
      setup_schema_tables
      seed_initial_data
      notify_tenant_created
    end
  rescue StandardError => e
    # Cleanup on failure
    cleanup_schema
    raise ProvisioningError, "Failed to provision tenant: #{e.message}"
  end
  
  def deprovision!
    ActiveRecord::Base.transaction do
      backup_data if should_backup?
      drop_schema
      @tenant.destroy!
    end
  end
  
  private
  
  # Create the tenant schema using Apartment
  def create_schema
    Apartment::Tenant.create(@tenant.subdomain)
    Rails.logger.info "Created schema for tenant: #{@tenant.subdomain}"
  end
  
  # Run any schema-specific setup
  def setup_schema_tables
    Apartment::Tenant.switch(@tenant.subdomain) do
      # Run migrations if needed
      # ActiveRecord::MigrationContext.new(
      #   Rails.root.join('db/tenant_migrations')
      # ).migrate
    end
  end
  
  # Seed initial data for the tenant
  def seed_initial_data
    Apartment::Tenant.switch(@tenant.subdomain) do
      # Create default project
      Project.create!(
        name: 'Getting Started',
        description: 'Your first project. Feel free to delete this.'
      )
      
      # Create sample data if in demo mode
      create_sample_data if @tenant.plan == 'trial'
    end
  end
  
  # Create sample data for trials
  def create_sample_data
    project = Project.first
    
    %w[Design Development Testing].each do |title|
      Task.create!(
        project: project,
        title: "Sample #{title} Task",
        status: 'pending'
      )
    end
  end
  
  # Notify about tenant creation
  def notify_tenant_created
    TenantMailer.welcome_email(@tenant).deliver_later
  end
  
  # Backup before deletion
  def backup_data
    TenantBackupJob.perform_now(@tenant.id)
  end
  
  def should_backup?
    @tenant.created_at < 30.days.ago
  end
  
  # Drop the schema
  def drop_schema
    Apartment::Tenant.drop(@tenant.subdomain)
    Rails.logger.info "Dropped schema for tenant: #{@tenant.subdomain}"
  end
  
  # Cleanup on provisioning failure
  def cleanup_schema
    Apartment::Tenant.drop(@tenant.subdomain)
  rescue StandardError => e
    Rails.logger.error "Failed to cleanup schema: #{e.message}"
  end
end
```

### Tenant Creation Controller

```ruby
# app/controllers/tenants_controller.rb

class TenantsController < ApplicationController
  # Skip tenant requirement for tenant creation
  skip_before_action :set_current_tenant_from_request, only: [:new, :create]
  
  def new
    @tenant = Tenant.new
  end
  
  def create
    @tenant = Tenant.new(tenant_params)
    @tenant.status = 'trial'
    @tenant.trial_ends_at = 14.days.from_now
    
    if @tenant.save
      # Provision the tenant schema
      TenantProvisioningService.new(@tenant).provision!
      
      # Create the first admin user
      create_admin_user(@tenant)
      
      # Redirect to the new tenant subdomain
      redirect_to root_url(subdomain: @tenant.subdomain),
                  notice: 'Your account has been created!'
    else
      render :new, status: :unprocessable_entity
    end
  rescue TenantProvisioningService::ProvisioningError => e
    @tenant.destroy
    flash.now[:alert] = 'Failed to create account. Please try again.'
    render :new, status: :unprocessable_entity
  end
  
  private
  
  def tenant_params
    params.require(:tenant).permit(:name, :subdomain)
  end
  
  def create_admin_user(tenant)
    Apartment::Tenant.switch(tenant.subdomain) do
      User.create!(
        email: params[:admin_email],
        password: params[:admin_password],
        role: 'admin'
      )
    end
  end
end
```

---

## Approach 3: Database Per Tenant

For maximum isolation, you can use a separate database for each tenant. This is common in enterprise SaaS with strict compliance requirements.

### Database-per-Tenant Architecture

```mermaid
flowchart TB
    subgraph Central Database
        CDB[(Central DB)]
        CDB --> Tenants[Tenants Table]
        CDB --> Connections[Connection Configs]
    end
    
    subgraph Tenant Databases
        DB1[(acme_production)]
        DB2[(globex_production)]
        DB3[(initech_production)]
    end
    
    App[Rails Application] --> Router[Connection Router]
    Router --> CDB
    Router --> DB1
    Router --> DB2
    Router --> DB3
```

### Dynamic Database Connection

```ruby
# app/models/concerns/multi_database_tenant.rb

module MultiDatabaseTenant
  extend ActiveSupport::Concern
  
  class_methods do
    # Connect to a specific tenant's database
    def connect_to_tenant(tenant)
      return if tenant.nil?
      
      config = tenant_database_config(tenant)
      establish_connection(config)
    end
    
    # Reset to default connection
    def reset_connection
      establish_connection(Rails.env.to_sym)
    end
    
    private
    
    # Build database configuration for tenant
    def tenant_database_config(tenant)
      base_config = ActiveRecord::Base.configurations.find_db_config(Rails.env).configuration_hash
      
      base_config.merge(
        database: "#{tenant.subdomain}_#{Rails.env}",
        host: tenant.database_host || base_config[:host],
        username: tenant.database_username || base_config[:username],
        password: tenant.database_password || base_config[:password]
      )
    end
  end
end
```

### Connection Switching Middleware

```ruby
# lib/middleware/tenant_database_switcher.rb

class TenantDatabaseSwitcher
  def initialize(app)
    @app = app
  end
  
  def call(env)
    request = Rack::Request.new(env)
    tenant = find_tenant(request)
    
    if tenant
      # Switch to tenant database
      switch_database(tenant) do
        @app.call(env)
      end
    else
      @app.call(env)
    end
  end
  
  private
  
  def find_tenant(request)
    subdomain = extract_subdomain(request.host)
    return nil if subdomain.blank?
    
    # Query central database for tenant
    Tenant.find_by(subdomain: subdomain)
  end
  
  def extract_subdomain(host)
    parts = host.split('.')
    return nil if parts.length < 3
    parts.first
  end
  
  def switch_database(tenant)
    original_config = ActiveRecord::Base.connection_db_config
    
    begin
      connect_to_tenant_database(tenant)
      yield
    ensure
      ActiveRecord::Base.establish_connection(original_config)
    end
  end
  
  def connect_to_tenant_database(tenant)
    config = build_tenant_config(tenant)
    ActiveRecord::Base.establish_connection(config)
  end
  
  def build_tenant_config(tenant)
    {
      adapter: 'postgresql',
      database: "tenant_#{tenant.subdomain}_#{Rails.env}",
      host: tenant.database_host,
      username: ENV['TENANT_DB_USERNAME'],
      password: ENV['TENANT_DB_PASSWORD'],
      pool: 5
    }
  end
end
```

### Tenant Database Migration Service

```ruby
# app/services/tenant_database_service.rb

class TenantDatabaseService
  class DatabaseError < StandardError; end
  
  def initialize(tenant)
    @tenant = tenant
  end
  
  # Create a new database for the tenant
  def create_database
    database_name = tenant_database_name
    
    # Connect to postgres database to create new database
    with_admin_connection do
      ActiveRecord::Base.connection.execute(
        "CREATE DATABASE #{ActiveRecord::Base.connection.quote_table_name(database_name)}"
      )
    end
    
    Rails.logger.info "Created database: #{database_name}"
    
    # Run migrations on the new database
    run_migrations
    
    # Seed initial data
    seed_database
  end
  
  # Drop the tenant database
  def drop_database
    database_name = tenant_database_name
    
    # Terminate existing connections
    terminate_connections(database_name)
    
    with_admin_connection do
      ActiveRecord::Base.connection.execute(
        "DROP DATABASE IF EXISTS #{ActiveRecord::Base.connection.quote_table_name(database_name)}"
      )
    end
    
    Rails.logger.info "Dropped database: #{database_name}"
  end
  
  # Run migrations on tenant database
  def run_migrations
    with_tenant_connection do
      ActiveRecord::MigrationContext.new(
        Rails.root.join('db/migrate'),
        ActiveRecord::SchemaMigration
      ).migrate
    end
  end
  
  private
  
  def tenant_database_name
    "tenant_#{@tenant.subdomain}_#{Rails.env}"
  end
  
  # Connect to postgres database for administrative tasks
  def with_admin_connection
    original_config = ActiveRecord::Base.connection_db_config
    
    begin
      admin_config = original_config.configuration_hash.merge(
        database: 'postgres'
      )
      ActiveRecord::Base.establish_connection(admin_config)
      yield
    ensure
      ActiveRecord::Base.establish_connection(original_config)
    end
  end
  
  # Connect to tenant database
  def with_tenant_connection
    original_config = ActiveRecord::Base.connection_db_config
    
    begin
      tenant_config = original_config.configuration_hash.merge(
        database: tenant_database_name
      )
      ActiveRecord::Base.establish_connection(tenant_config)
      yield
    ensure
      ActiveRecord::Base.establish_connection(original_config)
    end
  end
  
  # Terminate all connections to a database
  def terminate_connections(database_name)
    with_admin_connection do
      ActiveRecord::Base.connection.execute(<<-SQL)
        SELECT pg_terminate_backend(pg_stat_activity.pid)
        FROM pg_stat_activity
        WHERE pg_stat_activity.datname = '#{database_name}'
        AND pid <> pg_backend_pid()
      SQL
    end
  end
  
  def seed_database
    with_tenant_connection do
      Rails.application.load_seed
    end
  end
end
```

---

## Ensuring Data Isolation

Data isolation is critical in multi-tenant applications. Here are patterns to ensure tenant data never leaks:

### Query Scoping Validation

```ruby
# app/models/concerns/tenant_isolation.rb

module TenantIsolation
  extend ActiveSupport::Concern
  
  included do
    # Validate tenant isolation on every query
    after_find :verify_tenant_isolation
    before_save :verify_tenant_isolation
    before_destroy :verify_tenant_isolation
  end
  
  private
  
  # Ensure the record belongs to the current tenant
  def verify_tenant_isolation
    return unless ActsAsTenant.current_tenant
    return if tenant_id.nil?  # New record
    
    unless tenant_id == ActsAsTenant.current_tenant.id
      raise TenantIsolationError, 
            "Attempted to access record from different tenant"
    end
  end
end

class TenantIsolationError < StandardError; end
```

### Unscoped Query Safety

```ruby
# app/models/application_record.rb

class ApplicationRecord < ActiveRecord::Base
  primary_abstract_class
  
  # Override unscoped to require explicit tenant bypass
  class << self
    def unscoped_safely(&block)
      # Log unscoped access for auditing
      Rails.logger.warn(
        "Unscoped query on #{name} by #{Current.user&.email || 'system'}"
      )
      
      ActsAsTenant.without_tenant(&block)
    end
  end
end
```

### Preventing Cross-Tenant Associations

```ruby
# app/models/task.rb

class Task < ApplicationRecord
  acts_as_tenant :tenant
  
  belongs_to :project
  belongs_to :assignee, class_name: 'User', optional: true
  
  # Validate associations belong to same tenant
  validate :project_belongs_to_tenant
  validate :assignee_belongs_to_tenant
  
  private
  
  def project_belongs_to_tenant
    return unless project_id_changed?
    return if project.nil?
    
    unless project.tenant_id == tenant_id
      errors.add(:project, 'must belong to the same organization')
    end
  end
  
  def assignee_belongs_to_tenant
    return unless assignee_id_changed?
    return if assignee.nil?
    
    unless assignee.tenant_id == tenant_id
      errors.add(:assignee, 'must belong to the same organization')
    end
  end
end
```

---

## Background Jobs with Multi-tenancy

Background jobs need special handling to maintain tenant context:

### Tenant-Aware Sidekiq Job

```ruby
# app/jobs/concerns/tenant_job.rb

module TenantJob
  extend ActiveSupport::Concern
  
  included do
    # Store tenant info in job arguments
    attr_accessor :tenant_id
    
    # Set tenant before performing
    before_perform :set_tenant_context
    
    # Clear tenant after performing
    after_perform :clear_tenant_context
  end
  
  class_methods do
    # Override perform_later to capture current tenant
    def perform_later(*args, **kwargs)
      tenant_id = ActsAsTenant.current_tenant&.id
      super(*args, tenant_id: tenant_id, **kwargs)
    end
  end
  
  private
  
  def set_tenant_context
    return unless tenant_id
    
    tenant = Tenant.find(tenant_id)
    ActsAsTenant.current_tenant = tenant
    Current.tenant = tenant
    
    # For schema-based multi-tenancy
    # Apartment::Tenant.switch!(tenant.subdomain)
  end
  
  def clear_tenant_context
    ActsAsTenant.current_tenant = nil
    Current.tenant = nil
    
    # For schema-based multi-tenancy
    # Apartment::Tenant.reset
  end
end
```

### Example Tenant-Aware Job

```ruby
# app/jobs/send_project_report_job.rb

class SendProjectReportJob < ApplicationJob
  include TenantJob
  
  queue_as :reports
  
  # Retry with exponential backoff
  retry_on StandardError, wait: :exponentially_longer, attempts: 3
  
  def perform(project_id:, tenant_id:, recipient_email:)
    # Tenant context is automatically set by TenantJob concern
    
    project = Project.find(project_id)
    
    # Generate report
    report = ProjectReportService.new(project).generate
    
    # Send email
    ProjectMailer.report_email(
      project: project,
      recipient: recipient_email,
      report: report
    ).deliver_now
    
    # Log the action
    Rails.logger.info(
      "Sent project report for #{project.name} to #{recipient_email}"
    )
  end
end
```

### Sidekiq Middleware for Tenant Context

```ruby
# config/initializers/sidekiq.rb

Sidekiq.configure_server do |config|
  config.server_middleware do |chain|
    chain.add TenantMiddleware
  end
end

# lib/sidekiq/tenant_middleware.rb

module Sidekiq
  class TenantMiddleware
    def call(worker, job, queue)
      tenant_id = job['tenant_id']
      
      if tenant_id
        tenant = Tenant.find_by(id: tenant_id)
        
        if tenant
          ActsAsTenant.current_tenant = tenant
          Current.tenant = tenant
          
          # For Apartment
          # Apartment::Tenant.switch!(tenant.subdomain)
        end
      end
      
      yield
    ensure
      ActsAsTenant.current_tenant = nil
      Current.tenant = nil
      # Apartment::Tenant.reset
    end
  end
end
```

---

## Caching in Multi-tenant Applications

Caching must be tenant-aware to prevent data leakage:

### Tenant-Aware Cache Keys

```ruby
# app/models/concerns/tenant_cache_key.rb

module TenantCacheKey
  extend ActiveSupport::Concern
  
  included do
    # Override cache_key to include tenant
    def cache_key
      tenant_prefix = tenant_id || 'global'
      "tenant/#{tenant_prefix}/#{super}"
    end
    
    def cache_key_with_version
      tenant_prefix = tenant_id || 'global'
      "tenant/#{tenant_prefix}/#{super}"
    end
  end
end
```

### Fragment Caching with Tenant Scope

```erb
<%# app/views/projects/index.html.erb %>

<%# Cache the entire projects list per tenant %>
<% cache [current_tenant, 'projects', @projects.maximum(:updated_at)] do %>
  <div class="projects-list">
    <% @projects.each do |project| %>
      <%# Cache individual project cards %>
      <% cache [current_tenant, project] do %>
        <%= render 'project_card', project: project %>
      <% end %>
    <% end %>
  </div>
<% end %>
```

### Redis Cache with Tenant Namespace

```ruby
# config/initializers/cache.rb

Rails.application.configure do
  config.cache_store = :redis_cache_store, {
    url: ENV['REDIS_URL'],
    namespace: 'myapp_cache',
    
    # Use a proc to dynamically set namespace per request
    namespace: -> { 
      tenant = ActsAsTenant.current_tenant
      tenant ? "tenant_#{tenant.id}" : "shared"
    }
  }
end
```

### Cache Invalidation Service

```ruby
# app/services/tenant_cache_service.rb

class TenantCacheService
  def initialize(tenant)
    @tenant = tenant
  end
  
  # Clear all cache for a tenant
  def clear_all
    pattern = "tenant_#{@tenant.id}/*"
    
    Rails.cache.redis.then do |redis|
      keys = redis.keys(pattern)
      redis.del(*keys) if keys.any?
    end
    
    Rails.logger.info "Cleared cache for tenant #{@tenant.subdomain}"
  end
  
  # Clear specific cache types
  def clear_projects
    pattern = "tenant_#{@tenant.id}/projects/*"
    clear_pattern(pattern)
  end
  
  def clear_users
    pattern = "tenant_#{@tenant.id}/users/*"
    clear_pattern(pattern)
  end
  
  private
  
  def clear_pattern(pattern)
    Rails.cache.redis.then do |redis|
      keys = redis.keys(pattern)
      redis.del(*keys) if keys.any?
    end
  end
end
```

---

## Testing Multi-tenant Applications

Testing multi-tenant code requires careful setup:

### RSpec Configuration

```ruby
# spec/support/tenant_helpers.rb

module TenantHelpers
  # Set up a tenant for the test
  def set_tenant(tenant)
    ActsAsTenant.current_tenant = tenant
    Current.tenant = tenant
  end
  
  # Create and set a tenant
  def with_tenant(attributes = {})
    tenant = create(:tenant, attributes)
    set_tenant(tenant)
    tenant
  end
  
  # Execute block with a specific tenant
  def as_tenant(tenant, &block)
    original_tenant = ActsAsTenant.current_tenant
    set_tenant(tenant)
    yield
  ensure
    ActsAsTenant.current_tenant = original_tenant
    Current.tenant = original_tenant
  end
  
  # Execute block without tenant (for admin operations)
  def without_tenant(&block)
    ActsAsTenant.without_tenant(&block)
  end
end

RSpec.configure do |config|
  config.include TenantHelpers
  
  # Reset tenant before each test
  config.before(:each) do
    ActsAsTenant.current_tenant = nil
    Current.tenant = nil
  end
end
```

### Tenant Factory

```ruby
# spec/factories/tenants.rb

FactoryBot.define do
  factory :tenant do
    sequence(:name) { |n| "Tenant #{n}" }
    sequence(:subdomain) { |n| "tenant#{n}" }
    status { 'active' }
    plan { 'professional' }
    
    trait :trial do
      status { 'trial' }
      trial_ends_at { 14.days.from_now }
    end
    
    trait :suspended do
      status { 'suspended' }
      suspended_at { 1.day.ago }
    end
    
    trait :enterprise do
      plan { 'enterprise' }
    end
  end
end
```

### Model Spec Example

```ruby
# spec/models/project_spec.rb

require 'rails_helper'

RSpec.describe Project, type: :model do
  let(:tenant) { create(:tenant) }
  
  before { set_tenant(tenant) }
  
  describe 'validations' do
    it 'requires a name' do
      project = build(:project, name: nil)
      expect(project).not_to be_valid
      expect(project.errors[:name]).to include("can't be blank")
    end
    
    it 'requires unique name within tenant' do
      create(:project, name: 'My Project', tenant: tenant)
      duplicate = build(:project, name: 'My Project', tenant: tenant)
      
      expect(duplicate).not_to be_valid
      expect(duplicate.errors[:name]).to include('has already been taken')
    end
    
    it 'allows same name in different tenants' do
      other_tenant = create(:tenant)
      create(:project, name: 'My Project', tenant: tenant)
      
      as_tenant(other_tenant) do
        project = build(:project, name: 'My Project')
        expect(project).to be_valid
      end
    end
  end
  
  describe 'tenant scoping' do
    it 'automatically sets tenant_id' do
      project = create(:project, name: 'Test')
      expect(project.tenant_id).to eq(tenant.id)
    end
    
    it 'only returns projects for current tenant' do
      our_project = create(:project, tenant: tenant)
      
      other_tenant = create(:tenant)
      as_tenant(other_tenant) do
        create(:project)
      end
      
      expect(Project.all).to contain_exactly(our_project)
    end
    
    it 'prevents accessing other tenant projects' do
      other_tenant = create(:tenant)
      other_project = nil
      
      as_tenant(other_tenant) do
        other_project = create(:project)
      end
      
      expect { Project.find(other_project.id) }.to raise_error(ActiveRecord::RecordNotFound)
    end
  end
end
```

### Request Spec with Tenant Context

```ruby
# spec/requests/projects_spec.rb

require 'rails_helper'

RSpec.describe 'Projects API', type: :request do
  let(:tenant) { create(:tenant, subdomain: 'acme') }
  let(:user) { create(:user, tenant: tenant) }
  
  before do
    # Set subdomain for request
    host! "#{tenant.subdomain}.example.com"
    sign_in user
  end
  
  describe 'GET /projects' do
    it 'returns only current tenant projects' do
      our_projects = create_list(:project, 3, tenant: tenant)
      
      # Create projects in another tenant
      other_tenant = create(:tenant)
      without_tenant do
        create_list(:project, 2, tenant: other_tenant)
      end
      
      get '/projects'
      
      expect(response).to have_http_status(:ok)
      
      json = JSON.parse(response.body)
      expect(json['data'].length).to eq(3)
      
      returned_ids = json['data'].map { |p| p['id'] }
      expect(returned_ids).to match_array(our_projects.map(&:id))
    end
  end
  
  describe 'POST /projects' do
    it 'creates project for current tenant' do
      post '/projects', params: {
        project: { name: 'New Project', description: 'Test' }
      }
      
      expect(response).to have_http_status(:created)
      
      project = Project.last
      expect(project.tenant_id).to eq(tenant.id)
    end
  end
end
```

---

## Performance Considerations

### Database Indexing Strategy

```ruby
# db/migrate/XXXXXX_add_multi_tenant_indexes.rb

class AddMultiTenantIndexes < ActiveRecord::Migration[7.1]
  def change
    # Composite indexes for tenant-scoped queries
    # Always put tenant_id first in the index
    
    # Projects table
    add_index :projects, [:tenant_id, :created_at]
    add_index :projects, [:tenant_id, :updated_at]
    add_index :projects, [:tenant_id, :status]
    add_index :projects, [:tenant_id, :owner_id]
    
    # Tasks table
    add_index :tasks, [:tenant_id, :status, :due_date]
    add_index :tasks, [:tenant_id, :assignee_id, :status]
    add_index :tasks, [:tenant_id, :project_id, :created_at]
    
    # Users table
    add_index :users, [:tenant_id, :email], unique: true
    add_index :users, [:tenant_id, :role]
    add_index :users, [:tenant_id, :last_sign_in_at]
  end
end
```

### Query Optimization

```ruby
# app/models/project.rb

class Project < ApplicationRecord
  acts_as_tenant :tenant
  
  # Use includes to avoid N+1 queries
  scope :with_associations, -> {
    includes(:owner, :tasks)
  }
  
  # Efficient pagination with tenant scope
  scope :recent, -> {
    order(created_at: :desc)
      .limit(20)
  }
  
  # Count with tenant scope uses index
  def self.count_by_status
    group(:status).count
  end
end
```

### Connection Pool Sizing

```yaml
# config/database.yml

production:
  adapter: postgresql
  encoding: unicode
  
  # Formula: pool = (web_workers * threads) + (sidekiq_workers * threads) + buffer
  # Example: (4 Puma workers * 5 threads) + (2 Sidekiq processes * 10 threads) + 10 buffer
  pool: <%= ENV.fetch("RAILS_MAX_THREADS") { 50 } %>
  
  # Checkout timeout
  checkout_timeout: 5
  
  # Reaping frequency for idle connections
  reaping_frequency: 10
  
  # Connection settings
  connect_timeout: 5
  read_timeout: 30
  write_timeout: 30
```

---

## Security Best Practices

### Tenant Access Control

```ruby
# app/policies/application_policy.rb

class ApplicationPolicy
  attr_reader :user, :record
  
  def initialize(user, record)
    @user = user
    @record = record
  end
  
  # Always check tenant first
  def tenant_match?
    return false unless user&.tenant_id
    return false unless record_tenant_id
    
    user.tenant_id == record_tenant_id
  end
  
  private
  
  def record_tenant_id
    record.respond_to?(:tenant_id) ? record.tenant_id : nil
  end
end

# app/policies/project_policy.rb

class ProjectPolicy < ApplicationPolicy
  def show?
    tenant_match?
  end
  
  def create?
    tenant_match?
  end
  
  def update?
    tenant_match? && (user.admin? || record.owner_id == user.id)
  end
  
  def destroy?
    tenant_match? && user.admin?
  end
  
  class Scope < ApplicationPolicy::Scope
    def resolve
      # Scope is already tenant-filtered by acts_as_tenant
      # Add additional role-based filtering here
      if user.admin?
        scope.all
      else
        scope.where(owner_id: user.id)
              .or(scope.joins(:team_members).where(team_members: { user_id: user.id }))
      end
    end
  end
end
```

### Audit Logging

```ruby
# app/models/concerns/auditable.rb

module Auditable
  extend ActiveSupport::Concern
  
  included do
    after_create :log_create
    after_update :log_update
    after_destroy :log_destroy
  end
  
  private
  
  def log_create
    AuditLog.create!(
      tenant_id: tenant_id,
      user_id: Current.user&.id,
      action: 'create',
      auditable: self,
      changes: attributes,
      ip_address: Current.ip_address,
      user_agent: Current.user_agent
    )
  end
  
  def log_update
    return unless saved_changes.any?
    
    AuditLog.create!(
      tenant_id: tenant_id,
      user_id: Current.user&.id,
      action: 'update',
      auditable: self,
      changes: saved_changes,
      ip_address: Current.ip_address,
      user_agent: Current.user_agent
    )
  end
  
  def log_destroy
    AuditLog.create!(
      tenant_id: tenant_id,
      user_id: Current.user&.id,
      action: 'destroy',
      auditable_type: self.class.name,
      auditable_id: id,
      changes: attributes,
      ip_address: Current.ip_address,
      user_agent: Current.user_agent
    )
  end
end
```

---

## Deployment Considerations

### Environment Variables

```bash
# .env.production

# Database
DATABASE_URL=postgres://user:pass@db.example.com:5432/myapp_production
DATABASE_POOL_SIZE=50

# Redis
REDIS_URL=redis://redis.example.com:6379/0

# Multi-tenancy settings
TENANT_DEFAULT_PLAN=trial
TENANT_TRIAL_DAYS=14
TENANT_MAX_USERS_FREE=5

# Domain settings
APP_DOMAIN=myapp.com
FORCE_SSL=true
```

### Nginx Configuration for Subdomains

```nginx
# /etc/nginx/sites-available/myapp

server {
    listen 80;
    listen [::]:80;
    
    # Wildcard subdomain support
    server_name *.myapp.com myapp.com;
    
    # Redirect to HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    
    # Wildcard subdomain support
    server_name *.myapp.com myapp.com;
    
    # SSL certificates (use wildcard cert)
    ssl_certificate /etc/letsencrypt/live/myapp.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/myapp.com/privkey.pem;
    
    # Rails application
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Pass subdomain info
        proxy_set_header X-Subdomain $subdomain;
    }
    
    # Extract subdomain
    set $subdomain "";
    if ($host ~* ^([^.]+)\.myapp\.com$) {
        set $subdomain $1;
    }
}
```

---

## Summary

Multi-tenancy is fundamental to SaaS applications. Key takeaways:

- **Shared Database** is simplest and works well for most startups and small SaaS products
- **Schema-Based** provides better isolation with moderate complexity
- **Database-Per-Tenant** offers maximum isolation for enterprise requirements
- Always use **composite indexes** with tenant_id as the first column
- Implement **tenant context** in background jobs and caching
- Test **tenant isolation** thoroughly to prevent data leaks
- Use **audit logging** for compliance and debugging

Choose the approach that matches your isolation requirements, compliance needs, and operational capacity. You can start simple and migrate to stricter isolation as your product grows.

---

*Need to monitor your multi-tenant Rails application? [OneUptime](https://oneuptime.com) provides comprehensive monitoring with tenant-aware alerting, allowing you to track performance and errors per tenant.*
