export interface KiwifyOrder {
  order_id: string;
  order_ref: string;
  order_status: | "paid"
    | "waiting_payment"
    | "refused"
    | "refunded"
    | "chargedback";
  product_type: string;
  payment_method: string;
  store_id: string;
  payment_merchant_id: number;
  installments: number;
  card_type: string | null;
  card_last4digits: string | null;
  card_rejection_reason: string | null;
  boleto_URL: string | null;
  boleto_barcode: string | null;
  boleto_expiry_date: string | null;
  pix_code: string | null;
  pix_expiration: string | null;
  sale_type: string;
  created_at: string;
  updated_at: string;
  approved_date: string | null;
  refunded_at: string | null;
  webhook_event_type:
    | "billet_created"
    | "pix_created"
    | "order_rejected"
    | "order_approved"
    | "order_refunded"
    | "chargeback"
    | "subscription_canceled"
    | "subscription_late"
    | "subscription_renewed"
    | null;
  Product: Product;
  Customer: Customer;
  Commissions: Commissions;
  TrackingParameters: TrackingParameters;
  Subscription: Subscription;
  subscription_id: string;
}

interface Product {
  product_id: string;
  product_name: string;
}

interface Customer {
  full_name: string;
  first_name: string;
  email: string;
  mobile: string;
  cnpj: string;
  ip: string;
  instagram: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  zipcode: string;
}

interface CommissionedStore {
  [key: string]: unknown;
}

interface Commissions {
  charge_amount: number;
  product_base_price: number;
  product_base_price_currency: string;
  kiwify_fee: number;
  kiwify_fee_currency: string;
  settlement_amount: number;
  settlement_amount_currency: string;
  sale_tax_rate: number;
  sale_tax_amount: number;
  commissioned_stores: CommissionedStore[];
  currency: string;
  my_commission: number;
  funds_status: string | null;
  estimated_deposit_date: string | null;
  deposit_date: string | null;
}

interface TrackingParameters {
  src: string | null;
  sck: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  s1: string | null;
  s2: string | null;
  s3: string | null;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  frequency: string;
  qty_charges: number;
}

interface SubscriptionCharges {
  completed: unknown[];
  future: unknown[];
}

interface Subscription {
  id: string;
  start_date: string;
  next_payment: string;
  status: string;
  plan: SubscriptionPlan;
  charges: SubscriptionCharges;
}