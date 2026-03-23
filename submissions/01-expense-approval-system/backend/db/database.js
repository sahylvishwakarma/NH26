const knex = require('knex');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '..', 'expense_workflow.db');

let db;

function getDB() {
  if (!db) {
    db = knex({
      client: 'sqlite3',
      connection: { filename: DB_PATH },
      useNullAsDefault: true,
      pool: { min: 1, max: 1 },
    });
  }
  return db;
}

async function initDB() {
  const database = getDB();

  await database.raw('PRAGMA journal_mode = WAL');
  await database.raw('PRAGMA foreign_keys = ON');

  const hasUsers = await database.schema.hasTable('users');
  if (!hasUsers) {
    await database.schema.createTable('users', (t) => {
      t.increments('id').primary();
      t.string('name').notNullable();
      t.string('email').unique().notNullable();
      t.string('password_hash').notNullable();
      t.string('role').notNullable();
      t.string('department').notNullable();
      t.timestamp('created_at').defaultTo(database.fn.now());
    });
  }

  const hasExpenses = await database.schema.hasTable('expenses');
  if (!hasExpenses) {
    await database.schema.createTable('expenses', (t) => {
      t.increments('id').primary();
      t.integer('employee_id').notNullable().references('id').inTable('users');
      t.string('title').notNullable();
      t.text('description');
      t.float('amount').notNullable();
      t.string('category').notNullable();
      t.string('department').notNullable();
      t.string('receipt_path');
      t.string('receipt_filename');
      t.string('status').notNullable().defaultTo('pending');
      t.string('current_approver_role');
      t.integer('manager_id').references('id').inTable('users');
      t.integer('finance_admin_id').references('id').inTable('users');
      t.text('manager_comment');
      t.text('finance_comment');
      t.integer('requires_two_levels').defaultTo(0);
      t.timestamp('created_at').defaultTo(database.fn.now());
      t.timestamp('updated_at').defaultTo(database.fn.now());
    });
  }

  const hasAuditLog = await database.schema.hasTable('audit_log');
  if (!hasAuditLog) {
    await database.schema.createTable('audit_log', (t) => {
      t.increments('id').primary();
      t.integer('expense_id').notNullable().references('id').inTable('expenses');
      t.integer('actor_id');
      t.string('actor_name');
      t.string('actor_role');
      t.text('action').notNullable();
      t.text('comment');
      t.string('old_status');
      t.string('new_status');
      t.timestamp('created_at').defaultTo(database.fn.now());
    });
  }

  await seedDefaultUsers(database);
  console.log('Database initialized successfully.');
}

async function seedDefaultUsers(database) {
  const count = await database('users').count('id as cnt').first();
  if (count.cnt > 0) return;

  const password = bcrypt.hashSync('password123', 10);

  await database('users').insert([
    { name: 'Alice Employee', email: 'alice@company.com', password_hash: password, role: 'employee', department: 'Engineering' },
    { name: 'Bob Employee', email: 'bob@company.com', password_hash: password, role: 'employee', department: 'Marketing' },
    { name: 'Carol Manager', email: 'carol@company.com', password_hash: password, role: 'manager', department: 'Engineering' },
    { name: 'Dave Manager', email: 'dave@company.com', password_hash: password, role: 'manager', department: 'Marketing' },
    { name: 'Eve Finance Admin', email: 'eve@company.com', password_hash: password, role: 'finance_admin', department: 'Finance' },
  ]);

  console.log('Default users seeded. Password for all: password123');
}

module.exports = { getDB, initDB };
