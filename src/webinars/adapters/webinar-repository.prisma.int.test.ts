import { PrismaClient } from '@prisma/client';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { exec } from 'child_process';
import { PrismaWebinarRepository } from 'src/webinars/adapters/webinar-repository.prisma';
import { Webinar } from 'src/webinars/entities/webinar.entity';
import { promisify } from 'util';
const asyncExec = promisify(exec);

describe('PrismaWebinarRepository', () => {
  let container: StartedPostgreSqlContainer;
  let prismaClient: PrismaClient;
  let repository: PrismaWebinarRepository;
  
  beforeAll(async () => {
    container = await new PostgreSqlContainer()
      .withDatabase('test_db')
      .withUsername('user_test')
      .withPassword('password_test')
      .withExposedPorts(5432)
      .start();

    const dbUrl = container.getConnectionUri();
    prismaClient = new PrismaClient({
      datasources: {
        db: { url: dbUrl },
      },
    });

    // CORRECTION : On passe l'environnement dans les options, pas dans la commande car ca marche pas sous windows sinon
    await asyncExec(`npx prisma migrate deploy`, {
      env: {
        ...process.env,
        DATABASE_URL: dbUrl,
      },
    });

    return prismaClient.$connect();
  }, 60000); // Timeout augmenté à 60s pour que le docker se lance bien avant

    beforeEach(async () => {
        repository = new PrismaWebinarRepository(prismaClient);
        await prismaClient.webinar.deleteMany();
        await prismaClient.$executeRawUnsafe('DELETE FROM "Webinar" CASCADE');
    });

    afterAll(async () => {
    if (container) {
        await container.stop({ timeout: 1000 });
    }
    if (prismaClient) {
        await prismaClient.$disconnect();
    }
  });

    describe('Scenario : repository.create', () => {
        it('should create a webinar', async () => {
            // ARRANGE
            const webinar = new Webinar({
            id: 'webinar-id',
            organizerId: 'organizer-id',
            title: 'Webinar title',
            startDate: new Date('2022-01-01T00:00:00Z'),
            endDate: new Date('2022-01-01T01:00:00Z'),
            seats: 100,
            });

            // ACT
            await repository.create(webinar);

            // ASSERT
            const maybeWebinar = await prismaClient.webinar.findUnique({
            where: { id: 'webinar-id' },
            });
            expect(maybeWebinar).toEqual({
            id: 'webinar-id',
            organizerId: 'organizer-id',
            title: 'Webinar title',
            startDate: new Date('2022-01-01T00:00:00Z'),
            endDate: new Date('2022-01-01T01:00:00Z'),
            seats: 100,
            });
        });
    });

    describe('Scenario : repository.findById', () => {
        it('should find a webinar by id', async () => {
            // ARRANGE
            const webinarData = {
                id: 'webinar-id',
                organizerId: 'organizer-id',
                title: 'Webinar title',
                startDate: new Date('2022-01-01T00:00:00Z'),
                endDate: new Date('2022-01-01T01:00:00Z'),
                seats: 100,
            };
            
            await prismaClient.webinar.create({
                data: webinarData,
            });

            // ACT
            const webinar = await repository.findById('webinar-id');

            // ASSERT
            expect(webinar).toBeDefined();
            expect(webinar!.props).toEqual(webinarData);
        });

        it('should return null if webinar does not exist', async () => {
            // ACT
            const webinar = await repository.findById('unknown-id');

            // ASSERT
            expect(webinar).toBeNull();
        });
    });

    describe('Scenario : repository.update', () => {
        it('should update a webinar', async () => {
            // ARRANGE
            await prismaClient.webinar.create({
                data: {
                    id: 'webinar-id',
                    organizerId: 'organizer-id',
                    title: 'Webinar title',
                    startDate: new Date('2022-01-01T00:00:00Z'),
                    endDate: new Date('2022-01-01T01:00:00Z'),
                    seats: 100,
                },
            });

            const updatedWebinar = new Webinar({
                id: 'webinar-id',
                organizerId: 'organizer-id',
                title: 'Webinar updated title',
                startDate: new Date('2022-01-01T00:00:00Z'),
                endDate: new Date('2022-01-01T01:00:00Z'),
                seats: 200,
            });

            // ACT
            await repository.update(updatedWebinar);

            // ASSERT
            const savedWebinar = await prismaClient.webinar.findUnique({
                where: { id: 'webinar-id' },
            });

            expect(savedWebinar).toEqual({
                id: 'webinar-id',
                organizerId: 'organizer-id',
                title: 'Webinar updated title',
                startDate: new Date('2022-01-01T00:00:00Z'),
                endDate: new Date('2022-01-01T01:00:00Z'),
                seats: 200,
            });
        });
    });

});