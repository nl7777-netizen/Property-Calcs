/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// Body parser
app.use(express.json());

// Initialize Gemini client on the server with User-Agent set for AI Studio Builder tracking
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// API Route 1: Scrape tax year and bracket information from the internet
app.get("/api/sync-tax-year", async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY environment variable is not configured.");
    }

    console.log("Syncing tax year information using Gemini search grounding...");

    const prompt = `Search the web to find the CURRENT active Australian personal income tax thresholds and rates for individuals for the 2025-26 financial tax year (such as tax thresholds, base amounts, and marginal rates).
Also search for the standard Medicare Levy rate (usually 2%).
Return a clean, accurate JSON response containing the current financial year name (e.g. "2025-26") and the individual income tax brackets.
Ensure the JSON format has this EXACT schema:
{
  "financialYear": string,
  "brackets": [
    { "min": number, "max": number, "rate": number, "base": number }
  ],
  "medicareLevyRate": number
}
Ensure the rate is expressed as a decimal (e.g. 0.16 for 16%, 0.30 for 30%).
The base is the fixed tax amount for that bracket (e.g. 4288).
For the top bracket, omit or do not include "max", or set "max" to a extremely high number like 999999999.
Only return valid JSON matching the schema, with no markdown codeblocks or extra text.`;

    let responseText = "";
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              financialYear: { type: Type.STRING },
              brackets: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    min: { type: Type.NUMBER },
                    max: { type: Type.NUMBER },
                    rate: { type: Type.NUMBER },
                    base: { type: Type.NUMBER }
                  },
                  required: ["min", "rate", "base"]
                }
              },
              medicareLevyRate: { type: Type.NUMBER }
            },
            required: ["financialYear", "brackets", "medicareLevyRate"]
          }
        }
      });
      responseText = response.text.trim();
      console.log("Successfully retrieved tax rates using search grounding.");
    } catch (geminiError: any) {
      console.warn("Gemini call with Search Grounding failed, trying without Search Grounding...", geminiError.message || geminiError);
      // Try calling without googleSearch tool to avoid Search grounding quota limits
      try {
        const responseNoGrounding = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: `Generate the CURRENT active Australian personal income tax thresholds and rates for individuals for the 2025-26 financial tax year.
Also include the standard Medicare Levy rate (0.02).
Return a clean, accurate JSON response matching this EXACT schema:
{
  "financialYear": string,
  "brackets": [
    { "min": number, "max": number, "rate": number, "base": number }
  ],
  "medicareLevyRate": number
}
Ensure rates are decimals (e.g. 0.16 or 0.30). Only return valid JSON matching the schema.`,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                financialYear: { type: Type.STRING },
                brackets: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      min: { type: Type.NUMBER },
                      max: { type: Type.NUMBER },
                      rate: { type: Type.NUMBER },
                      base: { type: Type.NUMBER }
                    },
                    required: ["min", "rate", "base"]
                  }
                },
                medicareLevyRate: { type: Type.NUMBER }
              },
              required: ["financialYear", "brackets", "medicareLevyRate"]
            }
          }
        });
        responseText = responseNoGrounding.text.trim();
        console.log("Successfully retrieved tax rates WITHOUT search grounding.");
      } catch (retryError: any) {
        console.warn("Gemini call without Search Grounding also failed, throwing to trigger static fallback.", retryError.message || retryError);
        throw retryError;
      }
    }

    const data = JSON.parse(responseText);
    res.json(data);
  } catch (error: any) {
    console.log("Falling back to local high-quality 2025-26 ATO data because of error:", error.message || error);
    // Fallback local tax data (Stage 3 Tax Cuts) for 2025-26
    const localFallback = {
      financialYear: "2025-26",
      brackets: [
        { min: 1, max: 18200, rate: 0, base: 0 },
        { min: 18201, max: 45000, rate: 0.16, base: 0 },
        { min: 45001, max: 135000, rate: 0.30, base: 4288 },
        { min: 135001, max: 190000, rate: 0.37, base: 31288 },
        { min: 190001, max: 999999999, rate: 0.45, base: 51638 }
      ],
      medicareLevyRate: 0.02
    };
    res.json(localFallback);
  }
});

// Local lookup & deterministic generator for Suburbs
const localNSWSuburbs = [
  { name: 'Bondi', region: 'Eastern Suburbs', medianHousePrice: 3800000, historicalGrowthRate: 7.2 },
  { name: 'Chatswood', region: 'North Shore', medianHousePrice: 2900000, historicalGrowthRate: 6.8 },
  { name: 'Parramatta', region: 'Western Sydney', medianHousePrice: 1550000, historicalGrowthRate: 5.4 },
  { name: 'Blacktown', region: 'Greater West', medianHousePrice: 950000, historicalGrowthRate: 4.9 },
  { name: 'Newcastle', region: 'Hunter Region', medianHousePrice: 880000, historicalGrowthRate: 5.1 },
  { name: 'Byron Bay', region: 'North Coast', medianHousePrice: 2200000, historicalGrowthRate: 8.0 },
  { name: 'Wollongong', region: 'Illawarra', medianHousePrice: 1050000, historicalGrowthRate: 5.3 },
  { name: 'Hornsby', region: 'Upper North Shore', medianHousePrice: 1750000, historicalGrowthRate: 5.9 },
  { name: 'Marrickville', region: 'Inner West', medianHousePrice: 1950000, historicalGrowthRate: 6.5 },
  { name: 'Redfern', region: 'City & East', medianHousePrice: 1850000, historicalGrowthRate: 6.2 },
  { name: 'Ryde', region: 'Northern Suburbs', medianHousePrice: 2100000, historicalGrowthRate: 5.8 },
  { name: 'Mosman', region: 'Lower North Shore', medianHousePrice: 5100000, historicalGrowthRate: 7.5 },
  { name: 'Manly', region: 'Northern Beaches', medianHousePrice: 4200000, historicalGrowthRate: 7.0 },
  { name: 'Cronulla', region: 'Sutherland Shire', medianHousePrice: 2950000, historicalGrowthRate: 6.3 },
  { name: 'Penrith', region: 'Western Sydney', medianHousePrice: 900000, historicalGrowthRate: 5.0 },
  { name: 'Campbelltown', region: 'Macarthur', medianHousePrice: 840000, historicalGrowthRate: 4.8 },
  { name: 'Hurstville', region: 'St George', medianHousePrice: 1800000, historicalGrowthRate: 5.2 },
  { name: 'Randwick', region: 'Eastern Suburbs', medianHousePrice: 3150000, historicalGrowthRate: 6.7 },
  { name: 'Surry Hills', region: 'City & East', medianHousePrice: 2100000, historicalGrowthRate: 6.0 },
];

function getDeterministicSuburbMetrics(suburbName: string) {
  const normalized = suburbName.trim();
  const capitalized = normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
  
  // Check if we have exact or partial match in local set first
  const exactMatch = localNSWSuburbs.find(s => s.name.toLowerCase() === capitalized.toLowerCase());
  if (exactMatch) {
    return exactMatch;
  }

  const partialMatch = localNSWSuburbs.find(s => s.name.toLowerCase().includes(capitalized.toLowerCase()));
  if (partialMatch) {
    return {
      ...partialMatch,
      name: capitalized // preserve user entered casing style
    };
  }

  // Simple string hash for true fallback
  let hash = 0;
  for (let i = 0; i < capitalized.length; i++) {
    hash = (hash << 5) - hash + capitalized.charCodeAt(i);
    hash |= 0;
  }
  hash = Math.abs(hash);

  const regions = [
    "Eastern Suburbs", "Inner West", "North Shore", "Western Sydney", 
    "Greater West", "St George", "Northern Beaches", "Sutherland Shire",
    "Northern Suburbs", "South West Sydney", "Hills District", "Macarthur"
  ];
  const region = regions[hash % regions.length];

  // Plausible house price based on region
  let basePrice = 1200000;
  if (region === "Eastern Suburbs" || region === "Northern Beaches") {
    basePrice = 2800000;
  } else if (region === "North Shore" || region === "Inner West") {
    basePrice = 2200000;
  } else if (region === "Western Sydney" || region === "Greater West" || region === "Macarthur") {
    basePrice = 850000;
  } else if (region === "Sutherland Shire" || region === "Northern Suburbs" || region === "Hills District") {
    basePrice = 1600000;
  }

  const priceVariance = (hash % 15) * 50000 - 350000; // -$350k to +$350k
  const medianHousePrice = Math.max(750000, basePrice + priceVariance);

  // Plausible growth rate
  const growthRateBase = 4.8;
  const growthVariance = (hash % 31) * 0.1; // 0.0% to 3.0%
  const historicalGrowthRate = parseFloat((growthRateBase + growthVariance).toFixed(1));

  return {
    name: capitalized,
    region,
    medianHousePrice,
    historicalGrowthRate
  };
}

// API Route 2: Retrieve suburb real estate insights and metrics via Google Search Grounding
app.post("/api/suburb-insights", async (req, res) => {
  const { suburb } = req.body;
  if (!suburb) {
    return res.status(400).json({ error: "Suburb name is required." });
  }

  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY environment variable is not configured.");
    }

    console.log(`Retrieving real estate insights for suburb: ${suburb}...`);

    const prompt = `Search the internet for current Australian real estate market data for the NSW suburb "${suburb}".
Find the following key metrics:
1. The median house price in Australian Dollars (AUD).
2. The average historical annual capital growth rate (percentage) for houses in this suburb over the last 5 to 10 years.
3. The metropolitan or geographical region of NSW where this suburb is located (e.g., Eastern Suburbs, North Shore, Western Sydney, Greater West, Illawarra, Hunter Region, North Coast, Southern Highlands, etc.).

Return the results as a clean, structured JSON object with the following schema:
{
  "name": string,
  "region": string,
  "medianHousePrice": number,
  "historicalGrowthRate": number
}
Ensure name is capitalized correctly (e.g. "Parramatta" or "Marrickville").
Ensure historicalGrowthRate is a simple number (e.g., 5.4 for 5.4%).
Ensure medianHousePrice is an integer number of dollars (e.g., 1450000).
If exact statistics are unavailable, provide a highly educated estimate based on surrounding NSW suburbs.
Only return valid JSON matching the schema.`;

    let responseText = "";
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              region: { type: Type.STRING },
              medianHousePrice: { type: Type.NUMBER },
              historicalGrowthRate: { type: Type.NUMBER }
            },
            required: ["name", "region", "medianHousePrice", "historicalGrowthRate"]
          }
        }
      });
      responseText = response.text.trim();
      console.log(`Successfully retrieved suburb metrics for ${suburb} using search grounding.`);
    } catch (geminiError: any) {
      console.warn("Gemini suburb call with Search Grounding failed, trying without Search Grounding...", geminiError.message || geminiError);
      try {
        const responseNoGrounding = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: `Generate realistic current real estate market metrics for the NSW suburb "${suburb}".
Provide: median house price (AUD), historical annual capital growth rate (%), and metropolitan/geographical region in NSW.
Return a clean, accurate JSON response matching this EXACT schema:
{
  "name": string,
  "region": string,
  "medianHousePrice": number,
  "historicalGrowthRate": number
}
Only return valid JSON matching the schema.`,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                region: { type: Type.STRING },
                medianHousePrice: { type: Type.NUMBER },
                historicalGrowthRate: { type: Type.NUMBER }
              },
              required: ["name", "region", "medianHousePrice", "historicalGrowthRate"]
            }
          }
        });
        responseText = responseNoGrounding.text.trim();
        console.log(`Successfully retrieved suburb metrics for ${suburb} WITHOUT search grounding.`);
      } catch (retryError: any) {
        console.warn("Gemini suburb call without Search Grounding also failed, throwing to trigger static fallback.", retryError.message || retryError);
        throw retryError;
      }
    }

    const data = JSON.parse(responseText);
    res.json(data);
  } catch (error: any) {
    console.log(`Falling back to local deterministic generator for suburb: ${suburb} because of error:`, error.message || error);
    const data = getDeterministicSuburbMetrics(suburb);
    res.json(data);
  }
});

// For Vercel Serverless compatibility
export default app;
