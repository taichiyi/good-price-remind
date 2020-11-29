import * as mysql from 'mysql';
import { ConfigKeys } from './interfaces';
import keysJson from './config';

class MysqlModel {
  private pool: mysql.Pool | undefined;
  static instance=new MysqlModel(keysJson)
  keys: ConfigKeys;

  constructor(keys: ConfigKeys) {
    this.keys = keys;
  }
  static getInstance(){
    return this.instance
  }

  private poolQuery(
    sql: string,
    callback: (queryErr: mysql.MysqlError | null, results?: any, fields?: mysql.FieldInfo[] | undefined) => void,
  ) {
    if (this.keys === undefined) return;
    if (!this.pool) {
      const { sqlHost, sqlUser, sqlPasswd, sqlPort, sqlDbname } = this.keys;
      this.pool = mysql.createPool({
        connectionLimit: 10,
        // acquireTimeout: 60 * 1000,
        host: sqlHost,
        user: sqlUser,
        password: sqlPasswd,
        port: sqlPort,
        database: sqlDbname,
      })
    }

    this.pool.getConnection((err, connection) => {
      if (err) {
        throw err; // not connected!
      }
      connection.query(
        {
          sql,
          timeout: 60 * 1000,
        },
        (queryErr, results, fields) => {
          callback(queryErr, results, fields);
          connection.release();
        },
      );
    });
  }

  // private queryError (error: mysql.MysqlError, sql: string) {
  //   const logMsg = `${error.sqlMessage}<br />${sql}`;
  //   sendEmail({
  //     subject: 'mysqlError',
  //     text: logMsg,
  //     fromName: 'erp-bug',
  //   });
  // };

  public productsSelectQuery = ({
    attribute = [],
    where = [],
    indexStart = 0,
    indexEnd = 0,
    orderByKey = 'id',
    orderBySort = 'DESC',
  }: {
    attribute?: string[];
    where: { key: string; value: string }[];
    indexStart?: number;
    indexEnd?: number;
    orderByKey?: string;
    orderBySort?: string;
  }) =>
    new Promise<any>(resolve => {
      const attributeStr = attribute.length === 0 ? '*' : attribute.map(val => val).join(', ');
      const whereStr = where.map(val => `\`${val.key}\` = '${val.value}'`).join(' AND ');

      const LIMIT = indexEnd > 0 ? `LIMIT ${indexStart},${indexEnd}` : '';
      const ORDER_BY = `ORDER BY \`${orderByKey}\` ${orderBySort}`;

      const sql = `SELECT ${attributeStr} FROM \`products\` WHERE ${whereStr} ${ORDER_BY} ${LIMIT}`;
      this.poolQuery(sql, (error, results) => {
        let result = [];
        if (error) {
          // this.queryError(error, sql);
        } else {
          result = results;
        }
        resolve(result);
      });
    });
}

export default MysqlModel;
