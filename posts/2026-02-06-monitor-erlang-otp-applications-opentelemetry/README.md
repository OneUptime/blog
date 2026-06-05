# How to Monitor Erlang/OTP Applications with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Erlang, OTP, BEAM, Monitoring, Tracing

Description: Implement comprehensive OpenTelemetry monitoring for Erlang/OTP applications to gain visibility into process supervision, message passing, and BEAM VM metrics.

Erlang/OTP applications built on the BEAM virtual machine offer exceptional fault tolerance and concurrency through their actor model and supervision trees. However, the very features that make OTP applications resilient also make them challenging to observe. Thousands of processes communicating through message passing create complex interaction patterns that traditional monitoring approaches struggle to capture. OpenTelemetry provides the observability infrastructure needed to understand OTP application behavior.

## Why Monitor OTP Applications

OTP applications are fundamentally different from applications built on traditional threading models. The BEAM scheduler manages process execution, supervision trees automatically restart failed processes, and message passing happens asynchronously. This architecture demands monitoring that understands OTP's unique characteristics.

When an OTP application experiences issues, you need to answer questions like: Which supervisor tree is experiencing high restart rates? Are message queues building up in specific processes? Is the BEAM scheduler balanced across cores? How long do synchronous calls to GenServers take? OpenTelemetry's metrics and tracing provide answers to these questions.

## Understanding BEAM VM Metrics

The BEAM VM exposes runtime information through several mechanisms. Understanding these metrics is essential for effective monitoring:

**Process Metrics**: Total process count, process creation/destruction rate, message queue lengths, reductions (computational work units), memory usage per process.

**Scheduler Metrics**: Scheduler utilization, run queue lengths, context switches, time spent in garbage collection.

**Memory Metrics**: Total memory usage, process memory, binary memory, atom table size, ETS table memory.

**Distribution Metrics**: Connected nodes, inter-node latency, and distribution carrier details where your runtime or carrier exposes them.

## Setting Up OpenTelemetry in Erlang

Add OpenTelemetry dependencies to your `rebar.config`:

```erlang
{deps, [
    opentelemetry_api,
    opentelemetry,
    opentelemetry_exporter,
    opentelemetry_api_experimental,
    opentelemetry_experimental
]}.
```

Configure OpenTelemetry in your `sys.config`:

```erlang
[
    {opentelemetry, [
        {resource, [
            {service, #{
                name => "my-erlang-app",
                version => "1.0.0"
            }},
            {deployment, #{
                environment => "production"
            }}
        ]},
        {traces_exporter, otlp},
        {span_processor, batch}
    ]},
    {opentelemetry_exporter, [
        {otlp_protocol, http_protobuf},
        {otlp_endpoint, "http://localhost:4318"}
    ]},
    {opentelemetry_experimental, [
        {readers, [
            #{module => otel_metric_reader,
              config => #{export_interval_ms => 10000,
                          exporter => {otel_exporter_metrics_otlp, #{}}}}
        ]}
    ]}
].
```

## Instrumenting GenServers

GenServers are the building blocks of OTP applications. Instrument them to understand callback execution and message handling:

```erlang
-module(user_cache).
-behaviour(gen_server).

%% API
-export([start_link/1, get_user/1, put_user/2]).

%% gen_server callbacks
-export([init/1, handle_call/3, handle_cast/2, handle_info/2, terminate/2]).

-include_lib("opentelemetry_api/include/otel_tracer.hrl").

%%% API

start_link(Opts) ->
    gen_server:start_link({local, ?MODULE}, ?MODULE, Opts, []).

get_user(UserId) ->
    %% Start a span for the client-side call
    ?with_span(<<"user_cache.get_user">>, #{
        attributes => #{
            <<"user_id">> => UserId,
            <<"call_type">> => <<"sync">>
        }
    }, fun(_SpanCtx) ->
        gen_server:call(?MODULE, {get_user, UserId})
    end).

put_user(UserId, UserData) ->
    ?with_span(<<"user_cache.put_user">>, #{
        attributes => #{
            <<"user_id">> => UserId,
            <<"call_type">> => <<"async">>
        }
    }, fun(_SpanCtx) ->
        gen_server:cast(?MODULE, {put_user, UserId, UserData})
    end).

%%% gen_server callbacks

init(Opts) ->
    ?with_span(<<"user_cache.init">>, #{}, fun(_SpanCtx) ->
        %% Initialize ETS table for caching
        Tid = ets:new(user_cache_table, [set, private]),
        Ttl = proplists:get_value(ttl, Opts, 3600),

        ?set_attributes(#{
            <<"cache_ttl">> => Ttl,
            <<"storage">> => <<"ets">>
        }),

        erlang:send_after(60000, self(), cleanup_expired),
        {ok, #{table => Tid, ttl => Ttl}}
    end).

handle_call({get_user, UserId}, _From, State) ->
    ?with_span(<<"user_cache.handle_call.get_user">>, #{
        attributes => #{
            <<"user_id">> => UserId
        }
    }, fun(_SpanCtx) ->
        #{table := Tid} = State,

        case ets:lookup(Tid, UserId) of
            [{UserId, UserData, _ExpiresAt}] ->
                ?add_event(<<"cache_hit">>, #{<<"user_id">> => UserId}),
                {reply, {ok, UserData}, State};

            [] ->
                ?add_event(<<"cache_miss">>, #{<<"user_id">> => UserId}),

                %% Fetch from database
                case fetch_user_from_db(UserId) of
                    {ok, UserData} ->
                        ExpiresAt = erlang:system_time(second) + maps:get(ttl, State),
                        ets:insert(Tid, {UserId, UserData, ExpiresAt}),
                        {reply, {ok, UserData}, State};

                    {error, not_found} ->
                        {reply, {error, not_found}, State}
                end
        end
    end).

handle_cast({put_user, UserId, UserData}, State) ->
    ?with_span(<<"user_cache.handle_cast.put_user">>, #{
        attributes => #{
            <<"user_id">> => UserId
        }
    }, fun(_SpanCtx) ->
        #{table := Tid, ttl := Ttl} = State,
        ExpiresAt = erlang:system_time(second) + Ttl,
        ets:insert(Tid, {UserId, UserData, ExpiresAt}),
        ?add_event(<<"cache_updated">>, #{<<"user_id">> => UserId}),
        {noreply, State}
    end).

handle_info(cleanup_expired, State) ->
    ?with_span(<<"user_cache.cleanup_expired">>, #{}, fun(_SpanCtx) ->
        #{table := Tid} = State,
        Now = erlang:system_time(second),

        %% Remove expired entries
        Expired = ets:select(Tid, [{{'$1', '$2', '$3'}, [{'<', '$3', Now}], ['$1']}]),
        lists:foreach(fun(Key) -> ets:delete(Tid, Key) end, Expired),

        ?set_attributes(#{
            <<"expired_count">> => length(Expired)
        }),

        %% Schedule next cleanup
        erlang:send_after(60000, self(), cleanup_expired),
        {noreply, State}
    end).

terminate(Reason, State) ->
    ?with_span(<<"user_cache.terminate">>, #{
        attributes => #{
            <<"reason">> => iolist_to_binary(io_lib:format("~p", [Reason]))
        }
    }, fun(_SpanCtx) ->
        #{table := Tid} = State,
        ets:delete(Tid),
        ok
    end).

%%% Internal functions

fetch_user_from_db(UserId) ->
    ?with_span(<<"user_cache.fetch_from_db">>, #{
        attributes => #{
            <<"user_id">> => UserId
        }
    }, fun(_SpanCtx) ->
        %% Simulate database fetch
        timer:sleep(10),
        {ok, #{id => UserId, name => <<"User ", (integer_to_binary(UserId))/binary>>}}
    end).
```

## Monitoring Supervision Trees

Supervision trees are fundamental to OTP's fault tolerance. Monitor supervisor behavior to understand restart patterns:

```erlang
-module(monitored_supervisor).
-behaviour(supervisor).

-export([start_link/0, init/1]).
-include_lib("opentelemetry_api/include/otel_tracer.hrl").

start_link() ->
    supervisor:start_link({local, ?MODULE}, ?MODULE, []).

init([]) ->
    ?with_span(<<"supervisor.init">>, #{
        attributes => #{
            <<"supervisor">> => <<"monitored_supervisor">>,
            <<"strategy">> => <<"one_for_one">>
        }
    }, fun(_SpanCtx) ->
        %% Configure child specifications
        ChildSpecs = [
            #{
                id => worker_1,
                start => {worker_module, start_link, [worker_1]},
                restart => permanent,
                shutdown => 5000,
                type => worker,
                modules => [worker_module]
            },
            #{
                id => worker_2,
                start => {worker_module, start_link, [worker_2]},
                restart => permanent,
                shutdown => 5000,
                type => worker,
                modules => [worker_module]
            }
        ],

        SupFlags = #{
            strategy => one_for_one,
            intensity => 3,
            period => 60
        },

        ?set_attributes(#{
            <<"child_count">> => length(ChildSpecs),
            <<"max_restarts">> => 3,
            <<"restart_period">> => 60
        }),

        {ok, {SupFlags, ChildSpecs}}
    end).
```

Create a custom Logger handler to track supervisor reports:

```erlang
-module(supervisor_telemetry).

-export([log/2]).
-include_lib("opentelemetry_api/include/otel_tracer.hrl").

log(#{msg := {report, #{label := {supervisor, _}, report := Report}}}, _Config) ->
    %% Extract supervisor report details
    Supervisor = maps:get(supervisor, Report, undefined),
    Context = maps:get(errorContext, Report, undefined),
    Reason = maps:get(reason, Report, undefined),
    Offender = maps:get(offender, Report, #{}),

    %% Create a span for the supervisor event
    ?with_span(<<"supervisor.child_event">>, #{
        attributes => #{
            <<"supervisor">> => format_name(Supervisor),
            <<"context">> => format_name(Context),
            <<"reason">> => format_term(Reason),
            <<"child_id">> => get_child_id(Offender)
        }
    }, fun(_SpanCtx) ->
        case Context of
            child_terminated ->
                ?add_event(<<"child_terminated">>, #{
                    <<"exit_reason">> => format_term(Reason)
                });
            start_error ->
                ?set_status(error, <<"Child start failed">>);
            _ ->
                ok
        end
    end),

    ok;
log(_LogEvent, _Config) ->
    ok.

%%% Helper functions

format_name(Name) when is_atom(Name) ->
    atom_to_binary(Name, utf8);
format_name(Name) when is_pid(Name) ->
    list_to_binary(pid_to_list(Name));
format_name(Name) ->
    iolist_to_binary(io_lib:format("~p", [Name])).

format_term(Term) ->
    iolist_to_binary(io_lib:format("~p", [Term])).

get_child_id(Offender) ->
    case maps:get(id, Offender, undefined) of
        undefined -> <<"unknown">>;
        Id when is_atom(Id) -> atom_to_binary(Id, utf8);
        Id -> format_term(Id)
    end.
```

Install the event handler in your application:

```erlang
-module(my_app).
-behaviour(application).

-export([start/2, stop/1]).

start(_Type, _Args) ->
    %% Attach supervisor Logger handler
    logger:add_handler(supervisor_telemetry, supervisor_telemetry, #{
        level => error
    }),

    %% Start application supervisor
    my_app_sup:start_link().

stop(_State) ->
    logger:remove_handler(supervisor_telemetry),
    ok.
```

## Collecting BEAM VM Metrics

Create a metrics collector that registers observable gauges for BEAM runtime information:

```erlang
-module(beam_metrics_collector).
-behaviour(gen_server).

-export([start_link/0]).
-export([init/1, handle_call/3, handle_cast/2, handle_info/2]).

-include_lib("opentelemetry_api_experimental/include/otel_meter.hrl").

start_link() ->
    gen_server:start_link({local, ?MODULE}, ?MODULE, [], []).

init([]) ->
    erlang:system_flag(scheduler_wall_time, true),

    ?create_observable_gauge('beam.process.count',
        fun process_count_observer/1,
        [],
        #{description => <<"Current number of Erlang processes">>}),
    ?create_observable_gauge('beam.process.large_queues',
        fun large_queue_observer/1,
        [],
        #{description => <<"Processes with message queues over 1000 messages">>}),
    ?create_observable_gauge('beam.memory.bytes',
        fun memory_observer/1,
        [],
        #{description => <<"BEAM memory by category">>, unit => 'By'}),
    ?create_observable_gauge('beam.scheduler.count',
        fun scheduler_count_observer/1,
        [],
        #{description => <<"Schedulers online">>}),
    ?create_observable_gauge('beam.scheduler.utilization',
        fun scheduler_utilization_observer/1,
        [],
        #{description => <<"Average scheduler active time ratio">>}),
    ?create_observable_gauge('beam.distribution.nodes',
        fun distribution_nodes_observer/1,
        [],
        #{description => <<"Connected distributed Erlang nodes">>}),

    {ok, #{}}.

handle_call(_Request, _From, State) ->
    {reply, ok, State}.

handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info(_Info, State) ->
    {noreply, State}.

%%% Observable metric callbacks

process_count_observer(_Args) ->
    [{erlang:system_info(process_count), #{}}].

large_queue_observer(_Args) ->
    LargeQueues = lists:filter(fun(Pid) ->
        case process_info(Pid, message_queue_len) of
            {message_queue_len, Len} when Len > 1000 -> true;
            _ -> false
        end
    end, processes()),
    [{length(LargeQueues), #{}}].

memory_observer(_Args) ->
    [{Bytes, #{<<"type">> => atom_to_binary(Type, utf8)}} ||
        {Type, Bytes} <- erlang:memory()].

scheduler_count_observer(_Args) ->
    [{erlang:system_info(schedulers_online), #{}}].

scheduler_utilization_observer(_Args) ->
    SchedulerTimes = statistics(scheduler_wall_time),
    Utilizations = [Active / Total || {_, Active, Total} <- SchedulerTimes, Total > 0],
    Value = case Utilizations of
        [] -> 0;
        _ -> lists:sum(Utilizations) / length(Utilizations)
    end,
    [{Value, #{}}].

distribution_nodes_observer(_Args) ->
    [{length(erlang:nodes()), #{}}].
```

## Tracing Distributed OTP Applications

For distributed Erlang applications running across multiple nodes, propagate trace context:

```erlang
-module(distributed_worker).
-behaviour(gen_server).

-export([start_link/1, process_remote/2, process_work/2]).
-export([init/1, handle_call/3, handle_cast/2]).

-include_lib("opentelemetry_api/include/otel_tracer.hrl").

start_link(Node) ->
    gen_server:start_link({local, ?MODULE}, ?MODULE, [Node], []).

%% Process work on a remote node
process_remote(Node, WorkData) ->
    ?with_span(<<"distributed.process_remote">>, #{
        attributes => #{
            <<"target_node">> => atom_to_binary(Node, utf8),
            <<"local_node">> => atom_to_binary(node(), utf8)
        }
    }, fun(_SpanCtx) ->
        %% Serialize trace context for remote call
        TraceContext = otel_propagator_text_map:inject([]),

        %% Make remote call with trace context
        case rpc:call(Node, ?MODULE, process_work, [WorkData, TraceContext]) of
            {ok, Result} ->
                ?set_status(ok),
                {ok, Result};

            {error, Reason} ->
                ?set_status(error, format_term(Reason)),
                {error, Reason};

            {badrpc, Reason} ->
                ?set_status(error, <<"RPC failed">>),
                ?add_event(<<"rpc_failure">>, #{
                    <<"reason">> => format_term(Reason)
                }),
                {error, {badrpc, Reason}}
        end
    end).

%% Remote function that processes work
process_work(WorkData, TraceContext) ->
    %% Restore trace context on remote node
    otel_propagator_text_map:extract(TraceContext),

    ?with_span(<<"distributed.process_work">>, #{
        attributes => #{
            <<"node">> => atom_to_binary(node(), utf8),
            <<"work_size">> => byte_size(term_to_binary(WorkData))
        }
    }, fun(_) ->
        %% Perform actual work
        Result = perform_computation(WorkData),

        ?add_event(<<"work_completed">>, #{
            <<"result_size">> => byte_size(term_to_binary(Result))
        }),

        {ok, Result}
    end).

init([Node]) ->
    {ok, #{node => Node}}.

handle_call(_Request, _From, State) ->
    {reply, ok, State}.

handle_cast(_Msg, State) ->
    {noreply, State}.

%%% Helper functions

perform_computation(Data) ->
    %% Simulate computation
    timer:sleep(100),
    {computed, Data}.

format_term(Term) ->
    iolist_to_binary(io_lib:format("~p", [Term])).
```

## Monitoring ETS Tables

ETS tables are commonly used for caching and state management. Monitor their growth and access patterns:

```erlang
-module(ets_monitor).

-export([monitor_tables/0, get_table_stats/1]).
-include_lib("opentelemetry_api/include/otel_tracer.hrl").

monitor_tables() ->
    ?with_span(<<"ets.monitor_all_tables">>, #{}, fun(_SpanCtx) ->
        Tables = ets:all(),

        ?set_attributes(#{
            <<"table_count">> => length(Tables)
        }),

        lists:foreach(fun(Table) ->
            Stats = get_table_stats(Table),
            record_table_metrics(Table, Stats)
        end, Tables)
    end).

get_table_stats(Table) ->
    Info = try
        ets:info(Table)
    catch
        _:_ -> undefined
    end,

    case Info of
        undefined ->
            #{};
        _ ->
            #{
                name => proplists:get_value(name, Info),
                size => proplists:get_value(size, Info),
                memory => proplists:get_value(memory, Info),
                type => proplists:get_value(type, Info),
                owner => proplists:get_value(owner, Info)
            }
    end.

record_table_metrics(Table, Stats) ->
    case maps:get(name, Stats, undefined) of
        undefined ->
            ok;
        Name ->
            NameBin = format_table_name(Name),

            ?with_span(<<"ets.table_metrics">>, #{
                attributes => #{
                    <<"table_name">> => NameBin,
                    <<"table_size">> => maps:get(size, Stats, 0),
                    <<"table_memory_words">> => maps:get(memory, Stats, 0),
                    <<"table_type">> => atom_to_binary(maps:get(type, Stats, set), utf8)
                }
            }, fun(_) -> ok end)
    end.

format_table_name(Name) when is_atom(Name) ->
    atom_to_binary(Name, utf8);
format_table_name(Name) ->
    iolist_to_binary(io_lib:format("~p", [Name])).
```

## Visualizing OTP Application Architecture

OpenTelemetry traces reveal the structure of your OTP application:

```mermaid
graph TD
    A[Application] --> B[Root Supervisor]
    B --> C[Worker Pool Supervisor]
    B --> D[Cache GenServer]
    B --> E[API Supervisor]
    C --> F[Worker 1]
    C --> G[Worker 2]
    C --> H[Worker 3]
    E --> I[HTTP Handler]
    E --> J[WebSocket Handler]
```

Traces show which processes communicate with each other, how supervision trees respond to failures, and where performance bottlenecks exist.

## Best Practices for OTP Monitoring

**Process Naming**: Use registered names for important processes to make traces more readable. Anonymous PIDs are harder to correlate across trace spans.

**Supervision Hierarchy**: Tag spans with supervisor names and levels in the hierarchy. This helps identify which part of your application is experiencing issues.

**Message Queue Monitoring**: Alert on processes with consistently high message queue lengths. This indicates either insufficient processing capacity or a failing process.

**Scheduler Balance**: Monitor per-scheduler run queue lengths. Imbalanced schedulers can indicate scheduling problems or processes bound to specific cores.

**Distribution Health**: For distributed applications, monitor inter-node latency, node up/down events, and any distribution carrier metrics your runtime exposes. Network issues often manifest as node instability or increased message latency.

**Memory Pressure**: Track memory growth over time, especially binary memory. Memory leaks in Erlang often appear as steadily growing binary memory.

Monitoring Erlang/OTP applications with OpenTelemetry provides deep insight into the BEAM VM and process behavior. You can understand how your supervision trees handle failures, track message passing between processes, and identify performance bottlenecks in your concurrent architecture. This observability is essential for operating reliable, high-performance OTP applications in production.
