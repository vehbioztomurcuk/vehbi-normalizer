require('dotenv').config();
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

console.log("OpenAI initialized with API key:", process.env.OPENAI_API_KEY ? "Present" : "Missing");

async function consolidateAttributes(attributeMapping) {
    console.log("Starting attribute consolidation...");
    console.log(`Total number of attributes to consolidate: ${Object.keys(attributeMapping).length}`);

    const chunkSize = 20; // Reduced from 25 to 20
    const chunks = [];
    const keys = Object.keys(attributeMapping);

    for (let i = 0; i < keys.length; i += chunkSize) {
        const chunk = {};
        const chunkKeys = keys.slice(i, i + chunkSize);
        chunkKeys.forEach(key => {
            chunk[key] = attributeMapping[key];
        });
        chunks.push(chunk);
    }

    console.log(`Divided attributes into ${chunks.length} chunks of size ${chunkSize}`);

    let consolidatedResult = {};

    for (let i = 0; i < chunks.length; i++) {
        console.log(`Processing chunk ${i + 1} of ${chunks.length}`);
        let retries = 3;
        let success = false;
        while (retries > 0 && !success) {
            try {
                const chunkResult = await processChunk(chunks[i]);
                consolidatedResult = { ...consolidatedResult, ...chunkResult };
                success = true;
                console.log(`Completed processing chunk ${i + 1}`);
            } catch (error) {
                console.error(`Error processing chunk ${i + 1}. Retries left: ${retries - 1}`);
                retries--;
                if (retries === 0) {
                    console.error(`Failed to process chunk ${i + 1} after 3 attempts. Moving to next chunk.`);
                }
            }
        }
    }

    console.log("All chunks processed. Consolidation complete.");
    console.log(`Final number of consolidated attributes: ${Object.keys(consolidatedResult).length}`);

    return consolidatedResult;
}

async function processChunk(chunk) {
    try {
        console.log(`Processing chunk with ${Object.keys(chunk).length} attributes`);
        const messages = [
            {
                role: 'system',
                content: `You are an assistant that helps in consolidating game attribute mappings. Your task is to identify similar or identical parameters, merge them into unified entries, and retain their aliases for backward compatibility.`,
            },
            {
                role: 'user',
                content: `Here is the attribute mapping to consolidate: ${JSON.stringify(chunk)}. 
                Please merge identical or semantically similar attributes, creating a unified entry for each set of similar attributes. 
                The output should be a JSON object where each key is the unified attribute name, and the value is an object containing:
                - "unified": the standardized attribute name
                - "aliases": an array of all variations and aliases for this attribute, including the original key
                Follow this format for each entry:
                {
                  "unified_attribute_name": {
                    "unified": "standardized_name",
                    "aliases": ["original_key", "alias1", "alias2", ...]
                  }
                }`,
            },
        ];

        console.log("Sending request to OpenAI...");
        const response = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: messages,
            temperature: 0.3,
            max_tokens: 2000,
        });

        console.log("Received response from OpenAI");
        
        let result;
        try {
            const content = response.choices[0].message.content;
            console.log("Raw response content:", content);
            result = JSON.parse(content);
        } catch (parseError) {
            console.error("Error parsing OpenAI response for chunk:");
            console.error("Error message:", parseError.message);
            console.error("Attempting to fix incomplete JSON...");
            const fixedContent = fixIncompleteJSON(response.choices[0].message.content);
            console.log("Fixed content:", fixedContent);
            result = JSON.parse(fixedContent);
            console.log("Fixed and parsed JSON successfully");
        }

        console.log(`Chunk processed. Consolidated ${Object.keys(result).length} attributes`);
        
        // Log merges for this chunk
        Object.entries(result).forEach(([key, value]) => {
            if (value.aliases && value.aliases.length > 1) {
                console.log(`Merged in chunk: "${key}" with aliases: ${value.aliases.join(', ')}`);
            } else {
                console.log(`Attribute in chunk: "${key}" (no merging)`);
            }
        });

        return result;

    } catch (error) {
        console.error("Error in processChunk function:");
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);
        if (error.response) {
            console.error("OpenAI API Error:", error.response.data);
        } else {
            console.error("Error stack:", error.stack);
        }
        throw error;
    }
}

function fixIncompleteJSON(str) {
    console.log("Fixing incomplete JSON...");
    let depth = 0;
    let inString = false;
    let fixed = '';
    for (let i = 0; i < str.length; i++) {
        const char = str[i];
        if (char === '"' && str[i-1] !== '\\') inString = !inString;
        if (!inString) {
            if (char === '{' || char === '[') depth++;
            if (char === '}' || char === ']') depth--;
        }
        fixed += char;
        if (inString && i === str.length - 1) {
            fixed += '"'; // Close any unclosed string
            inString = false;
        }
    }
    while (depth > 0) {
        fixed += '}';
        depth--;
    }
    console.log("Fixed JSON:", fixed);
    return fixed;
}

module.exports = { consolidateAttributes };