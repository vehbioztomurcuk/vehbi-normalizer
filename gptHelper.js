require('dotenv').config();
const OpenAI = require('openai');
const { setTimeout } = require('timers/promises');

let openai;

function initializeOpenAI(apiKey) {
  openai = new OpenAI({
    apiKey: apiKey || process.env.OPENAI_API_KEY,
  });
}

async function normalizeItem(item, attributeMapping) {
  if (!openai) {
    throw new Error("OpenAI client is not initialized. Call initializeOpenAI first.");
  }

  console.log(`Normalizing item: ${item.item_name}`);

  // Truncate the item data if it's too large
  const truncatedItem = truncateItemData(item);

  const truncatedAttributeMapping = Object.fromEntries(
    Object.entries(attributeMapping).map(([key, value]) => [
      key,
      { standardized_name: value.standardized_name }
    ])
  );

  const messages = [
    {
      role: 'system',
      content: `You are an expert system for normalizing MMORPG game item data. Your task is to standardize attribute names based on the provided mapping, ensuring consistency across all items.`,
    },
    {
      role: 'user',
      content: `Normalize the following MMORPG item data using this attribute mapping:

Attribute Mapping:
${JSON.stringify(truncatedAttributeMapping, null, 2)}

Item to Normalize:
${JSON.stringify(truncatedItem, null, 2)}

Instructions:
1. Identify all attributes in the item data, including nested ones in 'primary', 'additional', 'bonus', and 'requirements'.
2. For each attribute, find the corresponding standardized name in the attribute mappingW.
3. If an exact match is not found, use the closest match based on the aliases provided in the mapping.
4. Rename the attributes to their standardized names, keeping the original values.
5. Maintain the original structure of the item (primary, additional, bonus, requirements).
6. If an attribute doesn't have a match in the mapping, keep it as is.
7. Return the normalized item data as a JSON object.

Please provide only the JSON output of the normalized item, without any additional explanation.`,
    },
  ];

  const maxRetries = 3;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      console.log(`Attempt ${retries + 1} to normalize item: ${item.item_name}`);
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: messages,
        temperature: 0.1,
        max_tokens: 1000,
      });

      const normalizedItem = JSON.parse(response.choices[0].message.content);
      console.log(`Successfully normalized item: ${item.item_name}`);
      return normalizedItem;
    } catch (error) {
      if (error.code === 'rate_limit_exceeded') {
        console.log(`Rate limit exceeded for item ${item.item_name}. Retrying in ${(retries + 1) * 5} seconds...`);
        await setTimeout((retries + 1) * 5000);
        retries++;
      } else {
        console.error(`Error normalizing item ${item.item_name}:`, error.message);
        throw error;
      }
    }
  }

  throw new Error(`Failed to normalize item ${item.item_name} after ${maxRetries} retries`);
}

function truncateItemData(item) {
  const maxLength = 500; // Reduced from 2000
  const truncatedItem = { ...item };

  const truncateString = (str) => {
    if (str && str.length > maxLength) {
      console.log(`Truncating long string in item ${item.item_name}`);
      return str.substring(0, maxLength) + '...';
    }
    return str;
  };

  // Truncate long string fields
  truncatedItem.item_name = truncateString(truncatedItem.item_name);
  truncatedItem.description = truncateString(truncatedItem.description);

  // Truncate nested objects
  ['primary', 'additional', 'bonus', 'requirements'].forEach(key => {
    if (truncatedItem[key] && typeof truncatedItem[key] === 'object') {
      Object.keys(truncatedItem[key]).forEach(subKey => {
        truncatedItem[key][subKey] = truncateString(truncatedItem[key][subKey]);
      });
    }
  });

  // Remove non-essential fields
  delete truncatedItem.icon;
  delete truncatedItem.image;

  return truncatedItem;
}

async function normalizeItems(items, attributeMapping, batchSize = 2) {
  const normalizedItems = [];
  const totalBatches = Math.ceil(items.length / batchSize);

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const currentBatch = i / batchSize + 1;
    console.log(`Processing batch ${currentBatch} of ${totalBatches}`);
    
    for (const item of batch) {
      try {
        console.log(`Starting normalization for item: ${item.item_name}`);
        const normalizedItem = await normalizeItem(item, attributeMapping);
        normalizedItems.push(normalizedItem);
        console.log(`Finished normalizing item: ${item.item_name}`);
      } catch (error) {
        console.error(`Error normalizing item ${item.item_name}:`, error.message);
      }
      console.log(`Waiting 2 seconds before processing next item...`);
      await setTimeout(2000);
    }
    
    if (i + batchSize < items.length) {
      console.log(`Batch ${currentBatch} complete. Waiting 10 seconds before processing next batch...`);
      await setTimeout(10000);
    }
  }

  console.log(`Normalization complete. Processed ${normalizedItems.length} out of ${items.length} items.`);
  return normalizedItems;
}

module.exports = { initializeOpenAI, normalizeItems };