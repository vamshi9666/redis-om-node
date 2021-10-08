import { fetchHashKeys, fetchHashFields, keyExists } from './helpers/redis-helper';
import { addBigfootSighting, Bigfoot, createBigfootSchema,
  A_BIGFOOT_SIGHTING, AN_ENTITY_ID, AN_ENTITY_KEY, ANOTHER_BIGFOOT_SIGHTING} from './helpers/bigfoot-data-helper';

import Client from '../lib/client';
import Schema from '../lib/schema/schema'
import Repository from '../lib/repository/repository';

import { EntityId } from '../lib/entity/entity-types';

describe("save hash", () => {

  let client: Client;
  let repository: Repository<Bigfoot>;
  let schema: Schema<Bigfoot>;
  let entity: Bigfoot;

  beforeAll(async () => {
    client = new Client();
    await client.open();
    schema = createBigfootSchema();
  });

  beforeEach(async () => {
    await client.execute(['FLUSHALL']);
    repository = client.fetchRepository<Bigfoot>(schema);
    await repository.createIndex();
  });

  afterAll(async () => await client.close());

  describe("#save", () => {

    describe("when saving a new entity", () => {
      let entityId: EntityId;
      let expectedKey: string;
  
      describe("a simple entity", () => {
        beforeEach(async () => {
          entity = repository.createEntity();
          entity.title = A_BIGFOOT_SIGHTING.title;
          entity.county = A_BIGFOOT_SIGHTING.county;
          entity.state = A_BIGFOOT_SIGHTING.state;
          entity.eyewitness = A_BIGFOOT_SIGHTING.eyewitness;
          entity.temperature = A_BIGFOOT_SIGHTING.temperature;
          entity.tags = A_BIGFOOT_SIGHTING.tags;
          entity.moreTags = A_BIGFOOT_SIGHTING.moreTags;
          entityId = await repository.save(entity);
          expectedKey = `Bigfoot:${entityId}`;
        });
  
        it("creates the expected fields in a Redis Hash", async () => {
          let fields = await fetchHashKeys(client, expectedKey);
          expect(fields).toHaveLength(7);
          expect(fields).toContainEqual('title');
          expect(fields).toContainEqual('county');
          expect(fields).toContainEqual('state');
          expect(fields).toContainEqual('eyewitness');
          expect(fields).toContainEqual('temperature');
          expect(fields).toContainEqual('tags');
          expect(fields).toContainEqual('moreTags');
        });
  
        it("stores the expected values in a Redis Hash", async () => {
          let values = await fetchHashFields(client, expectedKey, 'title', 'county', 'state', 'eyewitness', 'temperature', 'tags', 'moreTags');
          expect(values).toEqual([
            A_BIGFOOT_SIGHTING.title,
            A_BIGFOOT_SIGHTING.county,
            A_BIGFOOT_SIGHTING.state,
            '1',
            A_BIGFOOT_SIGHTING.temperature?.toString(),
            A_BIGFOOT_SIGHTING.tags?.join('|'),
            A_BIGFOOT_SIGHTING.moreTags?.join('&')]);
        });
      });
  
      describe("a sparsely populated entity", () => {
        beforeEach(async () => {
          entity = repository.createEntity();
          entity.state = A_BIGFOOT_SIGHTING.state;
          entity.eyewitness = A_BIGFOOT_SIGHTING.eyewitness;
          entity.temperature = A_BIGFOOT_SIGHTING.temperature;
          entityId = await repository.save(entity);
          expectedKey = `Bigfoot:${entityId}`;
        });
  
        it("creates the expected fields in a Redis Hash", async () => {
          let fields = await fetchHashKeys(client, expectedKey);
          expect(fields).toHaveLength(3);
          expect(fields).toContainEqual('state');
          expect(fields).toContainEqual('eyewitness');
          expect(fields).toContainEqual('temperature');
        });
  
        it("stores the expected values in a Redis Hash", async () => {
          let values = await fetchHashFields(client, expectedKey, 'title', 'county', 'state', 'eyewitness', 'temperature', 'tags', 'moreTags');
          expect(values).toEqual([
            null,
            null,
            A_BIGFOOT_SIGHTING.state,
            '1',
            A_BIGFOOT_SIGHTING.temperature?.toString(),
            null,
            null]);
        });
      });
  
      describe("a sparsely populated entity with explicit null and undefined", () => {
        beforeEach(async () => {
          entity = repository.createEntity();
          entity.title = A_BIGFOOT_SIGHTING.title;
          entity.county = null;
          entity.state = undefined;
          entity.eyewitness = null;
          entity.temperature = undefined;
          entity.tags = null;
          entity.moreTags = undefined;
          entityId = await repository.save(entity);
          expectedKey = `Bigfoot:${entityId}`;
        });
  
        it("creates the expected fields in a Redis Hash", async () => {
          let fields = await fetchHashKeys(client, expectedKey);
          expect(fields).toHaveLength(1);
          expect(fields).toContainEqual('title');
        });
  
        it("stores the expected values in a Redis Hash", async () => {
          let values = await fetchHashFields(client, expectedKey, 'title', 'county', 'state', 'eyewitness', 'temperature', 'tags', 'moreTags');
          expect(values).toEqual([A_BIGFOOT_SIGHTING.title, null, null, null, null, null, null]);
        });
      });
  
      describe("an unpopulated entity with all nulls and undefineds", () => {
        beforeEach(async () => {
          entity = repository.createEntity();
          entity.title = undefined;
          entity.county = null;
          entity.state = undefined;
          entity.eyewitness = null;
          entity.temperature = undefined;
          entity.tags = null;
          entity.tags = undefined;
          entityId = await repository.save(entity);
          expectedKey = `Bigfoot:${entityId}`;
        });
  
        it("creates no fields in a Redis Hash", async () => {
          let fields = await fetchHashKeys(client, expectedKey);
          expect(fields).toHaveLength(0);
        });
  
        it("stores nothing in the Redis Hash", async () => {
          let values = await fetchHashFields(client, expectedKey, 'title', 'county', 'state', 'eyewitness', 'temperature', 'tags', 'moreTags');
          expect(values).toEqual([null, null, null, null, null, null, null]);
        });
  
        it("doesn't even store the key", async () => {
          let exists = await keyExists(client, expectedKey);
          expect(exists).toBe(false);
        });
      });
    });

    describe("when updating an existing entity", () => {

      let entityId: EntityId;

      beforeEach(async () => {
        addBigfootSighting(client, AN_ENTITY_KEY, A_BIGFOOT_SIGHTING);
        entity = await repository.fetch(AN_ENTITY_ID);
      });

      describe("and updating all the fields in the entity", () => {
        beforeEach(async () => {
          entity.title = ANOTHER_BIGFOOT_SIGHTING.title;
          entity.county = ANOTHER_BIGFOOT_SIGHTING.county;
          entity.state = ANOTHER_BIGFOOT_SIGHTING.state;
          entity.eyewitness = ANOTHER_BIGFOOT_SIGHTING.eyewitness;
          entity.temperature = ANOTHER_BIGFOOT_SIGHTING.temperature;
          entity.tags = ANOTHER_BIGFOOT_SIGHTING.tags;
          entity.moreTags = ANOTHER_BIGFOOT_SIGHTING.tags;
          entityId = await repository.save(entity);
        });

        it("returns the Redis ID", () => expect(entityId).toBe(AN_ENTITY_ID))

        it("maintains the expected fields in a Redis Hash", async () => {
          let fields = await fetchHashKeys(client, AN_ENTITY_KEY);
          expect(fields).toHaveLength(7);
          expect(fields).toContainEqual('title');
          expect(fields).toContainEqual('county');
          expect(fields).toContainEqual('state');
          expect(fields).toContainEqual('eyewitness');
          expect(fields).toContainEqual('temperature');
          expect(fields).toContainEqual('tags');
          expect(fields).toContainEqual('moreTags');
        });

        it("updates the expected values in a Redis Hash", async () => {
          let values = await fetchHashFields(client, AN_ENTITY_KEY, 'title', 'county', 'state', 'eyewitness', 'temperature', 'tags', 'moreTags');
          expect(values).toEqual([
            ANOTHER_BIGFOOT_SIGHTING.title,
            ANOTHER_BIGFOOT_SIGHTING.county,
            ANOTHER_BIGFOOT_SIGHTING.state,
            '0',
            ANOTHER_BIGFOOT_SIGHTING.temperature?.toString(),
            ANOTHER_BIGFOOT_SIGHTING.tags?.join('|'),
            ANOTHER_BIGFOOT_SIGHTING.moreTags?.join('&')]);
        });
      });

      describe("and updating some of the fields in the entity", () => {
        beforeEach(async () => {
          entity.eyewitness = ANOTHER_BIGFOOT_SIGHTING.eyewitness;
          entity.temperature = ANOTHER_BIGFOOT_SIGHTING.temperature;
          entityId = await repository.save(entity);
        });

        it("returns the Redis ID", () => expect(entityId).toBe(AN_ENTITY_ID))

        it("maintains the expected fields in a Redis Hash", async () => {
          let fields = await fetchHashKeys(client, AN_ENTITY_KEY);
          expect(fields).toHaveLength(7);
          expect(fields).toContainEqual('title');
          expect(fields).toContainEqual('county');
          expect(fields).toContainEqual('state');
          expect(fields).toContainEqual('eyewitness');
          expect(fields).toContainEqual('temperature');
          expect(fields).toContainEqual('tags');
          expect(fields).toContainEqual('moreTags');
        });

        it("updates the expected values in a Redis Hash", async () => {
          let values = await fetchHashFields(client, AN_ENTITY_KEY, 'title', 'county', 'state', 'eyewitness', 'temperature', 'tags', 'moreTags');
          expect(values).toEqual([
            A_BIGFOOT_SIGHTING.title,
            A_BIGFOOT_SIGHTING.county,
            A_BIGFOOT_SIGHTING.state,
            '0',
            ANOTHER_BIGFOOT_SIGHTING.temperature?.toString(),
            A_BIGFOOT_SIGHTING.tags?.join('|'),
            A_BIGFOOT_SIGHTING.moreTags?.join('&')]);
        });
      });

      describe("and updating some of the fields in the entity to null or undefined", () => {
        beforeEach(async () => {
          entity.title = ANOTHER_BIGFOOT_SIGHTING.title;
          entity.county = null;
          entity.state = undefined;
          entity.eyewitness = null;
          entity.temperature = undefined;
          entity.tags = null;
          entity.moreTags = undefined;

          entityId = await repository.save(entity);
        });
        
        it("returns the Redis ID", () => expect(entityId).toBe(AN_ENTITY_ID))
        
        it("removes the null and undefined field from the Redis Hash", async () => {
          let fields = await fetchHashKeys(client, AN_ENTITY_KEY);
          expect(fields).toHaveLength(1);
          expect(fields).toContainEqual('title');
        });
        
        it("removes the expected values from the Redis Hash", async () => {
          let values = await fetchHashFields(client, AN_ENTITY_KEY, 'title', 'county', 'state', 'eyewitness', 'temperature', 'tags', 'moreTags');
          expect(values).toEqual([ANOTHER_BIGFOOT_SIGHTING.title, null, null, null, null, null, null]);
        });
      });

      describe("and updating all of the fields in the entity to null or undefined", () => {
        beforeEach(async () => {
          entity.title = undefined;
          entity.county = null;
          entity.state = undefined;
          entity.eyewitness = null;
          entity.temperature = undefined;
          entity.tags = null;
          entity.moreTags = undefined;

          entityId = await repository.save(entity);
        });
        
        it("returns the Redis ID", () => expect(entityId).toBe(AN_ENTITY_ID))
        
        it("removes the null and undefined field from the Redis Hash", async () => {
          let fields = await fetchHashKeys(client, AN_ENTITY_KEY);
          expect(fields).toHaveLength(0);
        });
        
        it("removes all the values from the Redis Hash", async () => {
          let values = await fetchHashFields(client, AN_ENTITY_KEY, 'title', 'county', 'state', 'eyewitness', 'temperature', 'tags', 'moreTags');
          expect(values).toEqual([null, null, null, null, null, null, null]);
        });

        it("removes the entity from Redis", async () => {
          let exists = await keyExists(client, AN_ENTITY_KEY)
          expect(exists).toBe(false);
        });
      });
    });
  });
});