require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const { initializeOpenAI, normalizeItems } = require('./gptHelper');

async function run(useTestData = false, apiKey = null) {
    console.log("Starting the normalization process");
    console.log(`Using ${useTestData ? 'test' : 'production'} data`);

    try {
        // Initialize OpenAI with the provided API key or from environment
        initializeOpenAI(apiKey);
        console.log("OpenAI client initialized");

        // Read the consolidated attributes
        const attributeMappingPath = path.join(__dirname, 'consolidated_attributes.json');
        const attributeMapping = JSON.parse(await fs.readFile(attributeMappingPath, 'utf8'));
        console.log(`Attribute mapping loaded successfully from ${attributeMappingPath}`);

        // Read the items to be normalized
        const itemsPath = path.join(__dirname, useTestData ? 'test-items.json' : 'final-items.json');
        const items = JSON.parse(await fs.readFile(itemsPath, 'utf8'));
        console.log(`Loaded ${items.length} items for normalization from ${itemsPath}`);

        // Normalize the items
        console.log("Starting item normalization");
        const startTime = Date.now();
        const normalizedItems = await normalizeItems(items, attributeMapping);
        const endTime = Date.now();
        console.log(`Normalized ${normalizedItems.length} items in ${(endTime - startTime) / 1000} seconds`);

        // Save the normalized items
        const outputPath = path.join(__dirname, useTestData ? 'normalized-test-items.json' : 'normalized-items.json');
        await fs.writeFile(outputPath, JSON.stringify(normalizedItems, null, 2));
        console.log(`Normalized items saved to: ${outputPath}`);

        // Log statistics
        console.log("\nNormalization Statistics:");
        console.log(`  Original items: ${items.length}`);
        console.log(`  Normalized items: ${normalizedItems.length}`);
        console.log(`  Failed items: ${items.length - normalizedItems.length}`);
        console.log(`  Success rate: ${((normalizedItems.length / items.length) * 100).toFixed(2)}%`);

        console.log("Normalization process complete");
    } catch (error) {
        console.error("An error occurred during normalization:");
        console.error(error.stack || error);
    }
}

console.log("Script started");
const useTestData = process.argv.includes('--test');
const apiKeyIndex = process.argv.indexOf('--api-key');
const apiKey = apiKeyIndex !== -1 ? process.argv[apiKeyIndex + 1] : null;

run(useTestData, apiKey).then(() => {
    console.log("Script finished execution");
}).catch(error => {
    console.error("Unhandled error in main execution:");
    console.error(error.stack || error);
    process.exit(1);
});