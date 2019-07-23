import { Column, Entity, JoinTable, ManyToMany, PrimaryGeneratedColumn } from "typeorm";

import { PaymentProfile } from "../paymentProfile/paymentProfile.entity";
import { IsEthAddress } from "../validator/isEthAddress";
import { IsXpub } from "../validator/isXpub";

@Entity()
export class Channel {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column("text")
  @IsXpub()
  userPublicIdentifier!: string;

  // might not need this
  @Column("text")
  @IsXpub()
  nodePublicIdentifier!: string;

  @Column("text")
  @IsEthAddress()
  multisigAddress!: string;

  @Column("boolean", { default: false })
  available!: boolean;

  @ManyToMany((type: any) => PaymentProfile, (profile: PaymentProfile) => profile.channels)
  @JoinTable()
  paymentProfiles!: PaymentProfile[];
}
