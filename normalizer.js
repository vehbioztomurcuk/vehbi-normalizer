const OpenAI = require('openai');
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function normalizeItem(item, attributeMapping) {
  console.log(`Normalizing item: ${item.item_name}`);

  const messages = [
    {
      role: 'system',
      content: `You are an assistant that normalizes game item data. Use the provided attribute mapping to standardize attribute names and formats.`,
    },
    {
      role: 'user',
      content: `Normalize this item data using the following attribute mapping: 
      ${JSON.stringify(attributeMapping)}
      
      Item to normalize:
      ${JSON.stringify(item, null, 2)}
      
      Please return the normalized item data as a JSON object.`,
    },
  ];

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: messages,
      temperature: 0.3,
      max_tokens: 1000,
    });

    const normalizedItem = JSON.parse(response.choices[0].message.content);
    console.log(`Successfully normalized item: ${item.item_name}`);
    return normalizedItem;
  } catch (error) {
    console.error(`Error normalizing item ${item.item_name}:`, error);
    throw error;
  }
}

async function normalizeItems(items, attributeMapping, batchSize = 5) {
  const normalizedItems = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchPromises = batch.map(item => normalizeItem(item, attributeMapping));
    const batchResults = await Promise.all(batchPromises);
    normalizedItems.push(...batchResults);
    console.log(`Processed batch ${i / batchSize + 1} of ${Math.ceil(items.length / batchSize)}`);
  }
  return normalizedItems;
}

module.exports = { normalizeItems };
