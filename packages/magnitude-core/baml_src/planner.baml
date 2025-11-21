class PartialRecipe {
    // this CoT pipeline is not thoroughly tested against alternatives
    // observations string? @description(#"Any key observations about past actions or current state"#)
    // meta_reasoning string @description(#"Reflect on the current state of task execution with respect to your own abilities as an agent"#)
    // reasoning string @description(#"Consider what you can see right now and what actions you can plan without guessing"#)

    // Simplifying CoT - seemed to be causing underplanning on Claude
    //observations string @description(#"What important clues or key information are worth considering?"#)
    reasoning string @description(#"What is the most actions you can safely take at once?"#)

    //actions ActionIntent[]
    @@dynamic
    //finished bool
}


// render "chunked" multimedia content of strings or images with no added whitespace between
// template_string RenderContent(content: (string | image)[]) #"
//     {% for chunk in content -%}{{chunk}}{%- endfor %}
// "#

template_string RenderMultiMediaContentParts(parts: MultiMediaContentPart[]) #"
    {% for part in parts -%}{{part}}{%- endfor %}
"#

template_string RenderMessages(messages: MultiMediaMessage[]) #"
    {% for message in messages -%}
    {%if message.cacheControl %}
    {{ _.role(message.role, cache_control={"type": "ephemeral"}) }}
    {{ RenderMultiMediaContentParts(message.content) }}
    {%else%}
    {{ _.role(message.role) }}
    {{ RenderMultiMediaContentParts(message.content) }}
    {%endif%}
    {%- endfor %}
"#


// template_string DescribeModularMemoryContext(context: ModularMemoryContext) #"
//     {% for entry in context.history %}
//         {% if entry.variant == "thought" %}
//             [{{entry.timestamp}}] {{entry.message}}
//         {% elif entry.variant == "turn" %}
//             [{{entry.timestamp}}] {{entry.action}}
//             {{ RenderContent(entry.content) }}
//         {% endif %}
//     {% endfor %}
// "#

// unused
template_string HybridMeta #"
    <meta>
    You are a web agent powered by (1) a powerful LLM (you) and (2) a small vision model (Moondream).
    You operate by planning out actions over time to try and complete a certain task.
    To do this successfully you may need to consider and adjust for your own limitations as an agent, so here is some information about how you work:
    - You plan several actions ahead of time without trying to guess, which are then executed
    - You are then given a new screenshot of the webpage which is the result of all actions taken
    - This occurs in a loop until you complete your task
    - Mouse movements require a "target", which is located by Moondream as a specific coordinate on the page
    - Moondream may sometimes fail to locate the target you expected it to.
    - Therefore, actions may not always be completely successful and you may need to try different variations
    </meta>
"#

template_string DescribeConnectorInstructions(memory: AgentContext) #"
    {% for conn in memory.connectorInstructions %}
    <{{ conn.connectorId }}>
    {{- conn.instructions -}}
    </{{ conn.connectorId }}>
    {% endfor %}
"#

template_string InstructionsWithContext(memory: AgentContext, instructions: string) #"
    {{ _.role("system", cache_control={"type": "ephemeral"}) }}
    <instructions>
    {{ instructions }}
    {%if memory.instructions %}

    {{ memory.instructions }}
    {%endif%}
    </instructions>
    {{ DescribeConnectorInstructions(memory) }}
    {{ ctx.output_format }}

    {{ RenderMessages(memory.observationContent) }}
"# 

template_string TaskInstructions(task: string, taskData: MultiMediaContentPart[]) #"
    Plan out actions that should be executed in order to complete the task:
    <task>
    {{ task }}
    </task>

    Use this data where appropriate during the task:
    <data>
    {{ RenderMultiMediaContentParts(taskData) }}
    </data>

    Execute the task serially.

    Plan out as many actions as possible, but stopping at the point where you will need to observe to plan further.
"#

// TODO: connector system instructions
function CreatePartialRecipe (memory: AgentContext, task: string, taskData: MultiMediaContentPart[], includeClaudeSpoof: bool) -> PartialRecipe {
    client SonnetAnthropic
    prompt #"
        {%if includeClaudeSpoof%}
        {{ _.role("system") }}
        You are Claude Code, Anthropic's official CLI for Claude.
        {%endif%}
        {{ InstructionsWithContext(memory, TaskInstructions(task, taskData)) }}
    "# 
}


test Foo {
    functions [CreatePartialRecipe]
    args {
        memory {
            observationContent [{ role "user", content ["test"] }]
            connectorInstructions []
        }
        task "foo"
        includeClaudeSpoof true
    }
}

// class EvaluatedCheck {
//     reasoning string
//     passes bool
// }
class QueryResponse {
    @@dynamic
}

function QueryMemory(memory: AgentContext, query: string, includeClaudeSpoof: bool) -> QueryResponse {
    client GeminiPro
    prompt #"
        {%if includeClaudeSpoof%}
        {{ _.role("system") }}
        You are Claude Code, Anthropic's official CLI for Claude.
        {%endif%}
        {{ InstructionsWithContext(memory, query) }}
    "#
}


// template_string CheckInstructions(check: string) #"
//     Given the actions of an LLM agent executing a test case, and a screenshot taken afterwards, evaluate whether the provided check "passes" i.e. holds true or not.

//     Check to evaluate:
//     <check>{{ check }}</check>
// "#

// function EvaluateCheck (context: ModularMemoryContext, check: string) -> EvaluatedCheck {
//     client GeminiPro
//     prompt #"
//         {{ InstructionsWithContext(context, CheckInstructions(check)) }}
//     "#
// }

// Moondream struggles to handle converted check, this is a bypass to use big model to evaluate check directly
// function EvaluateCheck (context: BrowserExecutionContext, check: string) -> EvaluatedCheck {
//     client GeminiPro
//     prompt #"
//         {{ _.role("system") }}
//         Given the actions of an LLM agent executing a test case, and a screenshot taken afterwards, evaluate whether the provided check "passes" i.e. holds true or not.
//         {{ ctx.output_format }}

//         {{ _.role("user")}}
//         Check to evaluate:
//         <check>{{ check }}</check>

//         {{ DescribeBrowserExecutionContext(context) }}
//     "# 
// }

class GroundedActionList {
    @@dynamic
}

function GroundActions(screenshot: image, actions: string) -> GroundedActionList {
    client GeminiPro
    prompt #"
        {{ _.role("system") }}
        You are a helpful assistant that grounds actions to a screenshot.
        
        You will receive a list of actions that need to be executed. Some of these actions may be missing specific coordinates (e.g. they may have generic coordinates like 0,0) but describe what they intend to click/scroll.
        
        Your job is to:
        1. Analyze the screenshot to find the correct elements.
        2. Update the actions with the precise x,y coordinates based on the screenshot.
        3. Return the list of grounded actions.
        
        {{ ctx.output_format }}
        
        {{ _.role("user") }}
        {{ screenshot }}
        
        Actions to ground:
        {{ actions }}
    "#
}
