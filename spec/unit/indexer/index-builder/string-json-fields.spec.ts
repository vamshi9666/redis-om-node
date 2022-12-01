import { Schema } from '$lib/schema/schema';
import { SchemaDefinition } from '$lib/schema/definition';
import { DataStructure } from '$lib/schema/options';
import { buildRediSearchIndex } from '$lib/indexer/index-builder';

const warnSpy = vi.spyOn(global.console, 'warn').mockImplementation(() => {})

describe("Schema", () => {
  describe.each([

    ["that defines an unconfigured string for a JSON", {
      schemaDef: { aField: { type: 'string' } } as SchemaDefinition,
      dataStructure: 'JSON',
      expectedRedisSchema: ['$.aField', 'AS', 'aField', 'TAG', 'SEPARATOR', '|'],
      expectedWarning: null
    }],

    ["that defines an unsorted string for a JSON", {
      schemaDef: { aField: { type: 'string', sortable: false } } as SchemaDefinition,
      dataStructure: 'JSON',
      expectedRedisSchema: ['$.aField', 'AS', 'aField', 'TAG', 'SEPARATOR', '|'],
      expectedWarning: null
    }],

    ["that defines a sorted string for a JSON", {
      schemaDef: { aField: { type: 'string', sortable: true } } as SchemaDefinition,
      dataStructure: 'JSON',
      expectedRedisSchema: ['$.aField', 'AS', 'aField', 'TAG', 'SEPARATOR', '|'],
      expectedWarning: "You have marked a string field as sortable but RediSearch doesn't support the SORTABLE argument on a TAG for JSON. Ignored."
    }],

    ["that defines a separated string for a JSON", {
      schemaDef: { aField: { type: 'string', separator: ';' } } as SchemaDefinition,
      dataStructure: 'JSON',
      expectedRedisSchema: ['$.aField', 'AS', 'aField', 'TAG', 'SEPARATOR', ';'],
      expectedWarning: null
    }],

    ["that defines an indexed string for a JSON", {
      schemaDef: { aField: { type: 'string', indexed: true } } as SchemaDefinition,
      dataStructure: 'JSON',
      expectedRedisSchema: ['$.aField', 'AS', 'aField', 'TAG', 'SEPARATOR', '|'],
      expectedWarning: null
    }],

    ["that defines an unindexed string for a JSON", {
      schemaDef: { aField: { type: 'string', indexed: false } } as SchemaDefinition,
      dataStructure: 'JSON',
      expectedRedisSchema: ['$.aField', 'AS', 'aField', 'TAG', 'SEPARATOR', '|', 'NOINDEX'],
      expectedWarning: null
    }],

    ["that defines a caseSensitive string for a JSON", {
      schemaDef: { aField: { type: 'string', caseSensitive: true } } as SchemaDefinition,
      dataStructure: 'JSON',
      expectedRedisSchema: ['$.aField', 'AS', 'aField', 'TAG', 'CASESENSITIVE', 'SEPARATOR', '|'],
      expectedWarning: null
    }],

    ["that defines a fully configured string for a JSON", {
      schemaDef: { aField: { type: 'string', sortable: true, separator: ';', indexed: false } } as SchemaDefinition,
      dataStructure: 'JSON',
      expectedRedisSchema: ['$.aField', 'AS', 'aField', 'TAG', 'SEPARATOR', ';', 'NOINDEX'],
      expectedWarning: "You have marked a string field as sortable but RediSearch doesn't support the SORTABLE argument on a TAG for JSON. Ignored."
    }]

  ])("%s", (_, data) => {

    let redisSchema: Array<string>;
    let schemaDef = data.schemaDef;
    let dataStructure = data.dataStructure as DataStructure;
    let expectedRedisSchema = data.expectedRedisSchema;
    let expectedWarning = data.expectedWarning;

    beforeEach(() => {
      warnSpy.mockReset();
      let schema = new Schema('TestEntity', schemaDef, { dataStructure });
      redisSchema = buildRediSearchIndex(schema);
    });

    it("generates a Redis schema for the field", () => {
      expect(redisSchema).toEqual(expectedRedisSchema);
    });

    if (expectedWarning) {
      it("generates the expected warning", () => {
        expect(warnSpy).toHaveBeenCalledWith(expectedWarning);
      });
    } else {
      it("does not generate a warning", () => {
        expect(warnSpy).not.toHaveBeenCalled();
      });
    }

  });
});
