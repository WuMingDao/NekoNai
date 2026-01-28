export const NAI_COMMAND = {
  name: "nai",
  description: "Generate an image with NovelAI",
  options: [
    {
      name: "prompt",
      description: "Image generation prompt",
      type: 3, // STRING
      required: true,
    },
    {
      name: "model",
      description: "Model to use",
      type: 3, // STRING
      required: true,
      choices: [
        { name: "V4.5 Curated", value: "v4_5_cur" },
        { name: "V4.5", value: "v4_5" },
        { name: "V3", value: "v3" },
        { name: "Furry", value: "furry" },
      ],
    },
    {
      name: "size",
      description: "Image size",
      type: 3, // STRING
      required: true,
      choices: [
        { name: "Portrait (Normal)", value: "portrait" },
        { name: "Landscape (Normal)", value: "landscape" },
        { name: "Square (Normal)", value: "square" },
      ],
    },
  ],
} as const;

export const ALL_COMMANDS = [NAI_COMMAND] as const;

